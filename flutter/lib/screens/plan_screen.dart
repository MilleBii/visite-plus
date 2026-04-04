import 'dart:convert';
import 'dart:math';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/eglise.dart';
import '../models/poi.dart';
import '../services/supabase_service.dart';
import '../config/type_config.dart';
import 'fiche_poi_screen.dart';

// ──────────────────────────────────────────────────────────────────────────────
// Positions GPS des POIs — démo Saint-Victor (mêmes que la maquette React).
// En production : les POIs du BO seront stockés en coordonnées locales (mètres)
// dans la colonne position[] après placement sur le plan Leaflet CRS.Simple.
// ──────────────────────────────────────────────────────────────────────────────
const _poisGps = [
  [47.22527, 6.11750], // vitrail
  [47.22535, 6.11755], // statue
  [47.22537, 6.11775], // tableau
  [47.22543, 6.11785], // demarche
];

// ──────────────────────────────────────────────────────────────────────────────
// Système de coordonnées locales (GPS → mètres → canvas)
// ──────────────────────────────────────────────────────────────────────────────
class _CoordSystem {
  final double latC, lonC, cosLat;
  final double angleDeg;

  _CoordSystem({
    required this.latC,
    required this.lonC,
    required this.cosLat,
    required this.angleDeg,
  });

  /// GPS [lat, lon] → coordonnées locales en mètres (repère tourné)
  Offset toLocal(double lat, double lon) {
    final x = (lon - lonC) * cosLat * 111320;
    final y = (lat - latC) * 111320;
    final a = angleDeg * pi / 180;
    return Offset(
      x * sin(a) + y * cos(a),
      x * cos(a) - y * sin(a),
    );
  }

  factory _CoordSystem.fromFootprint(List<List<double>> gps, double angleDeg) {
    final latC = gps.map((p) => p[0]).reduce((a, b) => a + b) / gps.length;
    final lonC = gps.map((p) => p[1]).reduce((a, b) => a + b) / gps.length;
    final cosLat = cos(latC * pi / 180);
    return _CoordSystem(latC: latC, lonC: lonC, cosLat: cosLat, angleDeg: angleDeg);
  }
}

/// Normalise une liste de points locaux vers des coordonnées canvas (0..W, 0..H).
/// L'axe Y est inversé (local Y↑ → canvas Y↓).
class _CanvasMapper {
  final double minX, maxX, minY, maxY;
  final double scale;
  final double padding;
  final double canvasWidth, canvasHeight;

  _CanvasMapper._({
    required this.minX, required this.maxX,
    required this.minY, required this.maxY,
    required this.scale, required this.padding,
    required this.canvasWidth, required this.canvasHeight,
  });

  factory _CanvasMapper.from(List<Offset> points, {double padding = 40}) {
    final xs = points.map((p) => p.dx);
    final ys = points.map((p) => p.dy);
    final minX = xs.reduce(min);
    final maxX = xs.reduce(max);
    final minY = ys.reduce(min);
    final maxY = ys.reduce(max);
    // Taille virtuelle canvas : 800 × 600 points
    const virtualW = 800.0;
    const virtualH = 600.0;
    final scaleX = (virtualW - padding * 2) / (maxX - minX).clamp(0.001, double.infinity);
    final scaleY = (virtualH - padding * 2) / (maxY - minY).clamp(0.001, double.infinity);
    final scale = min(scaleX, scaleY);
    final usedW = (maxX - minX) * scale + padding * 2;
    final usedH = (maxY - minY) * scale + padding * 2;
    return _CanvasMapper._(
      minX: minX, maxX: maxX, minY: minY, maxY: maxY,
      scale: scale, padding: padding,
      canvasWidth: usedW, canvasHeight: usedH,
    );
  }

  Offset toCanvas(Offset local) => Offset(
    (local.dx - minX) * scale + padding,
    (local.dy - minY) * scale + padding,
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Plan Screen
// ──────────────────────────────────────────────────────────────────────────────
class PlanScreen extends StatefulWidget {
  final String slug;

  const PlanScreen({super.key, required this.slug});

  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  Eglise? _eglise;
  List<Poi> _pois = [];
  bool _loading = true;
  Poi? _poiSelectionne;
  double _angle = 322; // angle par défaut Saint-Victor; remplacé par eglise.osmRotationAngle en prod
  static const double _polygonAngleOffsetDeg = -90;

  double get _appliedAngle => ((_angle % 360) + 360) % 360;
  double get _polygonAppliedAngle =>
      (((_angle + _polygonAngleOffsetDeg) % 360) + 360) % 360;

  late _CoordSystem _coords;
  late _CanvasMapper _mapper;
  List<Offset> _footprintLocal = [];
  List<Offset> _footprintCanvas = [];

  Offset _footprintCenterLocal = Offset.zero;

  Offset _rotateAround(Offset point, Offset center, double angleDeg) {
    final a = angleDeg * pi / 180;
    final dx = point.dx - center.dx;
    final dy = point.dy - center.dy;
    return Offset(
      center.dx + dx * cos(a) - dy * sin(a),
      center.dy + dx * sin(a) + dy * cos(a),
    );
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final eglise = await SupabaseService.fetchEgliseBySlug(widget.slug);
    if (!mounted) return;
    final pois = eglise != null ? await SupabaseService.fetchPois(eglise.id) : <Poi>[];
    if (!mounted) return;

    setState(() {
      _eglise = eglise;
      _pois = pois;
      _angle = eglise?.osmRotationAngle ?? 322;
      _loading = false;
    });

    debugPrint(
      '[PlanScreen] load slug=${widget.slug} egliseId=${eglise?.id} '
      'angleDb=${eglise?.osmRotationAngle} angleApplied=$_appliedAngle '
      'polygonAngleApplied=$_polygonAppliedAngle '
      'footprintRaw=${eglise?.osmFootprintJson != null} pois=${pois.length}',
    );

    _buildCoords();
  }

  void _buildCoords() {
    final raw = _eglise?.osmFootprintJson;
    if (raw == null) {
      debugPrint('[PlanScreen] buildCoords skipped: footprint null angleApplied=$_appliedAngle');
      return;
    }
    dynamic decodedJson;
    try {
      decodedJson = jsonDecode(raw);
    } catch (e) {
      debugPrint('[PlanScreen] Erreur décodage JSON footprint: $e');
      return;
    }

    List coordsList;
    bool isGeoJson = false;
    // Si GeoJSON (objet avec type/coordinates)
    if (decodedJson is Map && decodedJson.containsKey('coordinates')) {
      isGeoJson = true;
      final coords = decodedJson['coordinates'];
      if (coords is List && coords.isNotEmpty) {
        // Polygon: [ [ [lon, lat], ... ] ]
        if (coords[0] is List && coords[0].isNotEmpty && coords[0][0] is List) {
          coordsList = coords[0];
        } else {
          coordsList = coords;
        }
      } else {
        debugPrint('[PlanScreen] GeoJSON coordinates vide');
        return;
      }
    } else if (decodedJson is List) {
      coordsList = decodedJson;
    } else {
      debugPrint('[PlanScreen] Format footprint non reconnu: $decodedJson');
      return;
    }

    final decoded = coordsList
        .map((p) => isGeoJson
            ? [((p[1] as num).toDouble()), ((p[0] as num).toDouble())] // GeoJSON: [lon, lat] → [lat, lon]
            : [((p[0] as num).toDouble()), ((p[1] as num).toDouble())])
        .toList();
    _coords = _CoordSystem.fromFootprint(decoded, _angle);
    final baseFootprintLocal = decoded.map((p) => _coords.toLocal(p[0], p[1])).toList();
    final minX = baseFootprintLocal.map((p) => p.dx).reduce(min);
    final maxX = baseFootprintLocal.map((p) => p.dx).reduce(max);
    final minY = baseFootprintLocal.map((p) => p.dy).reduce(min);
    final maxY = baseFootprintLocal.map((p) => p.dy).reduce(max);
    _footprintCenterLocal = Offset((minX + maxX) / 2, (minY + maxY) / 2);

    _footprintLocal = baseFootprintLocal
        .map((p) => _rotateAround(p, _footprintCenterLocal, _polygonAngleOffsetDeg))
        .toList();

    _mapper = _CanvasMapper.from(_footprintLocal);
    _footprintCanvas = _footprintLocal.map(_mapper.toCanvas).toList();

    if (_footprintLocal.isNotEmpty) {
      final p = _footprintLocal.first;
      final pCanvas = _footprintCanvas.first;
      final pZero = _CoordSystem.fromFootprint(decoded, 0).toLocal(decoded.first[0], decoded.first[1]);
      debugPrint(
        '[PlanScreen] sample firstPoint local@0=(${pZero.dx.toStringAsFixed(2)},${pZero.dy.toStringAsFixed(2)}) '
        'local@applied=(${p.dx.toStringAsFixed(2)},${p.dy.toStringAsFixed(2)}) '
        'canvas=(${pCanvas.dx.toStringAsFixed(2)},${pCanvas.dy.toStringAsFixed(2)})',
      );
    }

    debugPrint(
      '[PlanScreen] buildCoords angleApplied=$_appliedAngle polygonAngleApplied=$_polygonAppliedAngle '
      'footprintPoints=${decoded.length} '
      'localBounds=(${_mapper.minX.toStringAsFixed(2)},${_mapper.minY.toStringAsFixed(2)})→'
      '(${_mapper.maxX.toStringAsFixed(2)},${_mapper.maxY.toStringAsFixed(2)})',
    );
  }

  Offset _poiCanvasPosition(Poi poi) {
    // Les POIs du BO sont stockés en coordonnées locales (CRS.Simple) et
    // doivent être mappés directement sur le canvas du plan.
    if (poi.positionX.isFinite && poi.positionY.isFinite) {
      // Repère local BO conservé: x, y sans permutation d'axes.
      final displayLocal = Offset(poi.positionX, poi.positionY);
      final alignedLocal = _rotateAround(displayLocal, _footprintCenterLocal, _polygonAngleOffsetDeg);
      final pos = _mapper.toCanvas(alignedLocal);
      debugPrint(
        '[PlanScreen] poi id=${poi.id} local=(${poi.positionX.toStringAsFixed(2)},${poi.positionY.toStringAsFixed(2)}) '
        'alignedLocal=(${alignedLocal.dx.toStringAsFixed(2)},${alignedLocal.dy.toStringAsFixed(2)}) '
        'canvas=(${pos.dx.toStringAsFixed(2)},${pos.dy.toStringAsFixed(2)}) angleApplied=$_appliedAngle polygonAngleApplied=$_polygonAppliedAngle',
      );
      return pos;
    }

    // Fallback legacy: anciennes données démo GPS Saint-Victor.
    final idx = _pois.indexOf(poi);
    if (idx >= 0 && idx < _poisGps.length) {
      final gps = _poisGps[idx];
      final baseLocal = _coords.toLocal(gps[0], gps[1]);
      final alignedLocal = _rotateAround(baseLocal, _footprintCenterLocal, _polygonAngleOffsetDeg);
      return _mapper.toCanvas(alignedLocal);
    }

    // Fallback : centroïde du plan
    return Offset(_mapper.canvasWidth / 2, _mapper.canvasHeight / 2);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_footprintCanvas.isEmpty) return const Scaffold(body: Center(child: Text('Polygone OSM manquant pour cette église.')));

    final safeBottom = MediaQuery.of(context).padding.bottom;
    final bottomPlanInset = safeBottom + 78;

    return Scaffold(
      backgroundColor: const Color(0xFFF0EDE8),
      body: SafeArea(
        child: Stack(
          children: [
            // ── Plan interactif ──────────────────────────────────────────────
            Positioned.fill(
              top: 70, // sous le header
              bottom: bottomPlanInset,
              child: _PlanView(
                footprintCanvas: _footprintCanvas,
                canvasWidth: _mapper.canvasWidth,
                canvasHeight: _mapper.canvasHeight,
                pois: _pois,
                poiSelectionne: _poiSelectionne,
                getPoiPosition: _poiCanvasPosition,
                onPoiTap: (poi) => setState(() => _poiSelectionne = poi),
                planImage: _eglise?.planImage,
              ),
            ),

            // ── Header ───────────────────────────────────────────────────────
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                color: Colors.white,
                padding: EdgeInsets.only(
                  top: MediaQuery.of(context).padding.top + 8,
                  left: 8,
                  right: 16,
                  bottom: 10,
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back),
                      onPressed: () => context.pop(),
                      color: const Color(0xFF1C1917),
                    ),
                    const SizedBox(width: 4),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Plan de l\'église',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: Color(0xFF1C1917)),
                        ),
                        Text(
                          '${_eglise?.nom ?? ''} · OpenStreetMap',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF78716C)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // ── Légende ──────────────────────────────────────────────────────
            if (_poiSelectionne == null)
              Positioned(
                bottom: MediaQuery.of(context).padding.bottom + 16,
                left: 0,
                right: 0,
                child: const _Legende(),
              ),

            // ── Panneau POI bas ───────────────────────────────────────────────
            if (_poiSelectionne != null)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: _PanneauPoiBas(
                  poi: _poiSelectionne!,
                  onFermer: () => setState(() => _poiSelectionne = null),
                  onOuvrir: () {
                    final poi = _poiSelectionne!;
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => FichePoiScreen(
                          slug: _eglise?.slug ?? '',
                          poiId: poi.id,
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
class _PlanView extends StatelessWidget {
  final List<Offset> footprintCanvas;
  final double canvasWidth, canvasHeight;
  final List<Poi> pois;
  final Poi? poiSelectionne;
  final Offset Function(Poi) getPoiPosition;
  final void Function(Poi) onPoiTap;
  final String? planImage;

  const _PlanView({
    required this.footprintCanvas,
    required this.canvasWidth,
    required this.canvasHeight,
    required this.pois,
    required this.poiSelectionne,
    required this.getPoiPosition,
    required this.onPoiTap,
    this.planImage,
  });

  @override
  Widget build(BuildContext context) {
    final planStack = Stack(
      clipBehavior: Clip.none,
      children: [
        // Fond plan (image custom OU polygone OSM)
        if (planImage != null)
          Positioned.fill(
            child: CachedNetworkImage(imageUrl: planImage!, fit: BoxFit.contain),
          )
        else
          CustomPaint(
            size: Size(canvasWidth, canvasHeight),
            painter: _FootprintPainter(points: footprintCanvas),
          ),

        // Marqueurs POI
        ...pois.map((poi) {
          final pos = getPoiPosition(poi);
          final cfg = getPoiConfig(poi.type);
          final isSelected = poiSelectionne?.id == poi.id;
          return Positioned(
            left: pos.dx - 20,
            top: pos.dy - 20,
            child: GestureDetector(
              onTap: () => onPoiTap(poi),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isSelected ? cfg.color : Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: cfg.color, width: 2.5),
                  boxShadow: const [
                    BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2)),
                  ],
                ),
                child: Center(
                  child: Text(
                    cfg.emoji,
                    style: TextStyle(fontSize: isSelected ? 16 : 14),
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );

    // LayoutBuilder pour calculer l'échelle initiale qui remplit l'espace dispo
    return LayoutBuilder(
      builder: (context, constraints) {
        final scaleX = constraints.maxWidth / canvasWidth;
        final scaleY = constraints.maxHeight / canvasHeight;
        final initialScale = min(scaleX, scaleY) * 0.92; // 92% pour un léger padding visuel

        return InteractiveViewer(
          minScale: initialScale * 0.5,
          maxScale: 5,
          boundaryMargin: const EdgeInsets.all(40),
          scaleFactor: 200,
          child: Center(
            child: Transform.scale(
              scale: initialScale,
              child: SizedBox(
                width: canvasWidth,
                height: canvasHeight,
                child: planStack,
              ),
            ),
          ),
        );
      },
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// CustomPainter — polygone bâtiment
// ──────────────────────────────────────────────────────────────────────────────
class _FootprintPainter extends CustomPainter {
  final List<Offset> points;

  const _FootprintPainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final fillPaint = Paint()
      ..color = const Color(0xFFFEF3C7).withOpacity(0.6)
      ..style = PaintingStyle.fill;

    final strokePaint = Paint()
      ..color = const Color(0xFFB7881C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      path.lineTo(p.dx, p.dy);
    }
    path.close();

    canvas.drawPath(path, fillPaint);
    canvas.drawPath(path, strokePaint);
  }

  @override
  bool shouldRepaint(_FootprintPainter old) => old.points != points;
}

// ──────────────────────────────────────────────────────────────────────────────
// Contrôle angle (démo — BO only en prod)
// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
// Légende
// ──────────────────────────────────────────────────────────────────────────────
class _Legende extends StatelessWidget {
  const _Legende();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE7E5E4)),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: poiTypeConfig.entries
              .map((entry) => Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            border: Border.all(color: entry.value.color, width: 2),
                          ),
                          child: Center(
                            child: Text(entry.value.emoji, style: const TextStyle(fontSize: 10)),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          entry.value.label,
                          style: const TextStyle(fontSize: 11, color: Color(0xFF44403C)),
                        ),
                      ],
                    ),
                  ))
              .toList(),
        ),
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Panneau bas — fiche POI courte
// ──────────────────────────────────────────────────────────────────────────────
class _PanneauPoiBas extends StatelessWidget {
  final Poi poi;
  final VoidCallback onFermer;
  final VoidCallback onOuvrir;

  const _PanneauPoiBas({
    required this.poi,
    required this.onFermer,
    required this.onOuvrir,
  });

  @override
  Widget build(BuildContext context) {
    final cfg = getPoiConfig(poi.type);
    return GestureDetector(
      onTap: onOuvrir,
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20, offset: Offset(0, -4))],
        ),
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 16,
          bottom: MediaQuery.of(context).padding.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFD6D3D1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            Stack(
              children: [
                Row(
                  children: [
                    // Vignette photo
                    if (poi.photo != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: CachedNetworkImage(
                          imageUrl: poi.photo!,
                          width: 72,
                          height: 72,
                          fit: BoxFit.cover,
                        ),
                      )
                    else
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F5F4),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(cfg.icon, color: cfg.color, size: 28),
                      ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // (Type POI supprimé)
                          Text(
                            poi.titre,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1C1917),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Appuyer pour en savoir plus →',
                            style: TextStyle(fontSize: 13, color: Color(0xFF78716C)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Bouton fermer
                Positioned(
                  top: 0,
                  right: 0,
                  child: GestureDetector(
                    onTap: onFermer,
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF5F5F4),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close, size: 14, color: Color(0xFF78716C)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

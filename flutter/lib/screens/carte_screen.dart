import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../models/eglise.dart';
import '../services/supabase_service.dart';
import '../config/type_config.dart';
import 'package:flutter/foundation.dart';
import './_store_button.dart';
import '../main.dart';
import '../l10n/app_localizations.dart';

class CarteScreen extends StatefulWidget {
  const CarteScreen({super.key});

  @override
  State<CarteScreen> createState() => _CarteScreenState();
}

class _CarteScreenState extends State<CarteScreen> {
  final MapController _mapController = MapController();
  List<Eglise> _eglises = [];
  bool _loading = true;
  String? _error;
  Eglise? _egliseBulle;
  Position? _userPosition;

  String _search = '';
  List<Eglise> _filteredEglises = [];
  bool _showSearchResults = false;

  @override
  void initState() {
    super.initState();
    _loadData();
    _requestGeolocation();
  }

  Future<void> _loadData() async {
    try {
      // ignore: avoid_print
      print('📍 CarteScreen: Loading eglises...');
      final eglises = await SupabaseService.fetchEglises();
      // ignore: avoid_print
      print('📍 CarteScreen: Got ${eglises.length} eglises');
      setState(() {
        _eglises = eglises;
        _filteredEglises = eglises;
        _loading = false;
      });
    } catch (e) {
      // ignore: avoid_print
      print('❌ CarteScreen error: $e');
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _requestGeolocation() async {
    try {
      final permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
      );
      if (!mounted) return;
      setState(() => _userPosition = position);
      _mapController.move(
        LatLng(position.latitude, position.longitude),
        10,
      );
    } catch (_) {
      // Géoloc non disponible, on reste sur la vue France
    }
  }

  void _onMarkerTap(Eglise eglise) {
    if (_egliseBulle?.id == eglise.id) {
      context.push('/eglise/${eglise.safeSlug}');
    } else {
      setState(() => _egliseBulle = eglise);
      _precacheEgliseImages(eglise);
    }
  }

  void _precacheEgliseImages(Eglise eglise) {
    if (eglise.photoFacade != null) {
      precacheImage(NetworkImage(eglise.photoFacade!), context);
    }
    SupabaseService.fetchPois(eglise.id).then((pois) {
      if (!mounted) return;
      for (final poi in pois) {
        if (poi.photo != null) {
          precacheImage(NetworkImage(poi.photo!), context);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations(LocaleScope.of(context).locale);

    return Scaffold(
      body: Stack(
        children: [
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            Center(
              child: Text(
                '${l10n.error} : $_error',
                style: const TextStyle(color: Colors.red),
              ),
            )
          else
            FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: const LatLng(46.603354, 1.888334),
                initialZoom: 6,
                onTap: (_, __) => setState(() => _egliseBulle = null),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'fr.visite_plus.app',
                  maxZoom: 19,
                ),
                MarkerLayer(
                  markers: [
                    if (_userPosition != null)
                      Marker(
                        point: LatLng(_userPosition!.latitude, _userPosition!.longitude),
                        width: 20,
                        height: 20,
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                          ),
                        ),
                      ),
                    ..._eglises.map((e) => Marker(
                          point: LatLng(e.latitude, e.longitude),
                          width: 40,
                          height: 40,
                          child: GestureDetector(
                            onTap: () => _onMarkerTap(e),
                            child: _EgliseMarker(
                              eglise: e,
                              isSelected: _egliseBulle?.id == e.id,
                            ),
                          ),
                        )),
                  ],
                ),
              ],
            ),

          // Overlay résultats recherche
          if (_showSearchResults && _search.isNotEmpty)
            Positioned(
              top: MediaQuery.of(context).padding.top + 60,
              left: 16,
              right: 16,
              child: Material(
                elevation: 6,
                borderRadius: BorderRadius.circular(12),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _filteredEglises.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final e = _filteredEglises[i];
                    return ListTile(
                      leading: Icon(e.typeIcon, color: Colors.black54),
                      title: Text(e.nom),
                      subtitle: Text(e.ville),
                      onTap: () {
                        setState(() {
                          _showSearchResults = false;
                          _egliseBulle = e;
                        });
                        _mapController.move(LatLng(e.latitude, e.longitude), 15);
                      },
                    );
                  },
                ),
              ),
            ),

          // Titre app + barre de recherche
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8)],
                  ),
                  child: const Text(
                    'Visite+',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1B4332),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      contentPadding:
                          const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
                      hintText: l10n.searchHint,
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none,
                      ),
                      prefixIcon: const Icon(Icons.search, size: 18),
                      isDense: true,
                    ),
                    onChanged: (value) {
                      setState(() {
                        _search = value;
                        _showSearchResults = value.isNotEmpty;
                        _filteredEglises = _eglises
                            .where((e) =>
                                e.nom.toLowerCase().contains(_search.toLowerCase()) ||
                                e.ville.toLowerCase().contains(_search.toLowerCase()))
                            .toList();
                      });
                    },
                  ),
                ),
              ],
            ),
          ),

          // Boutons App Store & Google Play (web uniquement)
          if (kIsWeb)
            Positioned(
              left: 0,
              right: 0,
              bottom: MediaQuery.of(context).padding.bottom + 16,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  StoreButton(
                    label: 'App Store',
                    url: 'https://apps.apple.com/app/visite-plus/id0000000000',
                  ),
                  SizedBox(width: 16),
                  StoreButton(
                    label: 'Google Play',
                    url: 'https://play.google.com/store/apps/details?id=fr.visite_plus.app',
                  ),
                ],
              ),
            ),

          // Bulle de nom (premier tap)
          if (_egliseBulle != null)
            Positioned(
              bottom: MediaQuery.of(context).padding.bottom + 24,
              left: 16,
              right: 16,
              child: _EgliseBulle(
                eglise: _egliseBulle!,
                onTap: () => context.push('/eglise/${_egliseBulle!.safeSlug}'),
                onClose: () => setState(() => _egliseBulle = null),
              ),
            ),
        ],
      ),
    );
  }
}

class _EgliseMarker extends StatelessWidget {
  final Eglise eglise;
  final bool isSelected;

  const _EgliseMarker({required this.eglise, required this.isSelected});

  @override
  Widget build(BuildContext context) {
    final color = EgliseTypeMarkerConfig.getColor(eglise.type);
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      decoration: BoxDecoration(
        color: isSelected ? color : Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 2.5),
        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
      ),
      child: Center(
        child: Icon(
          eglise.typeIcon,
          size: 18,
          color: isSelected ? Colors.white : color,
        ),
      ),
    );
  }
}

class _EgliseBulle extends StatelessWidget {
  final Eglise eglise;
  final VoidCallback onTap;
  final VoidCallback onClose;

  const _EgliseBulle({
    required this.eglise,
    required this.onTap,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations(LocaleScope.of(context).locale);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 16, offset: Offset(0, 4))],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(eglise.nom, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 2),
                  Text(
                    '${eglise.ville} · ${_capitalize(eglise.type)}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF1B4332),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                l10n.visit,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onClose,
              child: const Icon(Icons.close, size: 20, color: Color(0xFF78716C)),
            ),
          ],
        ),
      ),
    );
  }

  String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

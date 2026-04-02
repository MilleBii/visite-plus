import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:go_router/go_router.dart';
import '../models/poi.dart';
import '../services/supabase_service.dart';
import '../config/type_config.dart';

class FichePoiScreen extends StatefulWidget {
  final String slug;
  final int poiId;

  const FichePoiScreen({super.key, required this.slug, required this.poiId});

  @override
  State<FichePoiScreen> createState() => _FichePoiScreenState();
}

class _FichePoiScreenState extends State<FichePoiScreen> {
  Poi? _poi;
  bool _loading = true;

  // TTS
  final FlutterTts _tts = FlutterTts();
  _TtsState _ttsState = _TtsState.stopped;

  @override
  void initState() {
    super.initState();
    _load();
    _initTts();
  }

  @override
  void dispose() {
    _tts.stop();
    super.dispose();
  }

  Future<void> _load() async {
    final poi = await SupabaseService.fetchPoiById(widget.poiId);
    if (!mounted) return;
    setState(() {
      _poi = poi;
      _loading = false;
    });
    if (poi != null) {
      SupabaseService.trackView(entiteType: 'poi', entiteId: poi.id);
    }
  }

  Future<void> _initTts() async {
    await _tts.setLanguage('fr-FR');
    await _tts.setSpeechRate(0.5);
    await _tts.setPitch(1.0);

    _tts.setStartHandler(() => setState(() => _ttsState = _TtsState.playing));
    _tts.setCompletionHandler(() => setState(() => _ttsState = _TtsState.stopped));
    _tts.setPauseHandler(() => setState(() => _ttsState = _TtsState.paused));
    _tts.setContinueHandler(() => setState(() => _ttsState = _TtsState.playing));
    _tts.setErrorHandler((_) => setState(() => _ttsState = _TtsState.stopped));
  }

  Future<void> _toggleTts() async {
    if (_poi == null) return;
    switch (_ttsState) {
      case _TtsState.stopped:
        await _tts.speak(_poi!.texteTts);
      case _TtsState.playing:
        await _tts.pause();
      case _TtsState.paused:
        await _tts.speak(_poi!.texteTts);
    }
  }

  Future<void> _stopTts() async {
    await _tts.stop();
    setState(() => _ttsState = _TtsState.stopped);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_poi == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: const Center(child: Text('POI introuvable.')),
      );
    }

    final poi = _poi!;
    final cfg = getPoiConfig(poi.type);

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          // ── Photo en-tête ────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: Colors.white,
            leading: Padding(
              padding: const EdgeInsets.all(8),
              child: CircleAvatar(
                backgroundColor: Colors.black38,
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white, size: 18),
                  onPressed: () => context.pop(),
                ),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: poi.photo != null
                  ? CachedNetworkImage(
                      imageUrl: poi.photo!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: const Color(0xFFE7E5E4)),
                      errorWidget: (_, __, ___) => Container(color: const Color(0xFFE7E5E4)),
                    )
                  : Container(
                      color: const Color(0xFFF5F5F4),
                      child: Icon(cfg.icon, size: 64, color: cfg.color.withOpacity(0.5)),
                    ),
            ),
          ),

          // ── Contenu ──────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                20,
                20,
                MediaQuery.of(context).padding.bottom + 40,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type badge + titre
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: cfg.color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(cfg.emoji, style: const TextStyle(fontSize: 13)),
                            const SizedBox(width: 4),
                            Text(
                              cfg.label,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: cfg.color,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    poi.titre,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1C1917),
                      height: 1.2,
                    ),
                  ),

                  // ── Bouton audio guide ───────────────────────────────────
                  const SizedBox(height: 14),
                  _TtsButton(
                    state: _ttsState,
                    onToggle: _toggleTts,
                    onStop: _stopTts,
                  ),

                  const SizedBox(height: 24),

                  // ── Sections texte ───────────────────────────────────────
                  if (poi.texteResume != null && poi.texteResume!.isNotEmpty) ...[
                    _TextSection(titre: 'Résumé', texte: poi.texteResume!),
                    const SizedBox(height: 20),
                  ],
                  if (poi.texteComprendre != null && poi.texteComprendre!.isNotEmpty) ...[
                    _TextSection(titre: 'Comprendre l\'œuvre', texte: poi.texteComprendre!),
                    const SizedBox(height: 20),
                  ],
                  if (poi.texteHistorique != null && poi.texteHistorique!.isNotEmpty) ...[
                    _TextSection(titre: 'Contexte historique', texte: poi.texteHistorique!),
                    const SizedBox(height: 20),
                  ],
                  if (poi.texteBible != null && poi.texteBible!.isNotEmpty) ...[
                    _BibleSection(texte: poi.texteBible!),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Bouton TTS
// ──────────────────────────────────────────────────────────────────────────────
enum _TtsState { stopped, playing, paused }

class _TtsButton extends StatelessWidget {
  final _TtsState state;
  final VoidCallback onToggle;
  final VoidCallback onStop;

  const _TtsButton({required this.state, required this.onToggle, required this.onStop});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        GestureDetector(
          onTap: onToggle,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: state == _TtsState.stopped
                  ? const Color(0xFF1B4332)
                  : const Color(0xFF1B4332).withOpacity(0.85),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  state == _TtsState.playing ? Icons.pause : Icons.play_arrow,
                  color: Colors.white,
                  size: 18,
                ),
                const SizedBox(width: 6),
                Text(
                  state == _TtsState.stopped
                      ? '▶ Écouter'
                      : state == _TtsState.playing
                          ? '⏸ Pause'
                          : '▶ Reprendre',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (state != _TtsState.stopped) ...[
          const SizedBox(width: 10),
          GestureDetector(
            onTap: onStop,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.stop, size: 18, color: Color(0xFF78716C)),
            ),
          ),
        ],
      ],
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Section texte standard
// ──────────────────────────────────────────────────────────────────────────────
class _TextSection extends StatelessWidget {
  final String titre;
  final String texte;

  const _TextSection({required this.titre, required this.texte});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Color(0xFFE7E5E4)),
            ),
          ),
          child: Text(
            titre,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF78716C),
              letterSpacing: 0.5,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          texte,
          style: const TextStyle(
            fontSize: 15,
            color: Color(0xFF1C1917),
            height: 1.65,
          ),
        ),
      ],
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Section citation biblique
// ──────────────────────────────────────────────────────────────────────────────
class _BibleSection extends StatelessWidget {
  final String texte;

  const _BibleSection({required this.texte});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF9EC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('📖 ', style: TextStyle(fontSize: 16)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Dans la Bible',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF92400E),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  texte,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF78350F),
                    fontStyle: FontStyle.italic,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:go_router/go_router.dart';
import '../models/poi.dart';
import '../services/supabase_service.dart';
import '../config/type_config.dart';
import '../main.dart';
import '../l10n/app_localizations.dart';

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

  final FlutterTts _tts = FlutterTts();
  _TtsState _ttsState = _TtsState.stopped;

  @override
  void initState() {
    super.initState();
    _loadPoi();
  }

  Future<void> _loadPoi() async {
    setState(() => _loading = true);
    try {
      final poi = await SupabaseService.fetchPoiById(widget.poiId);
      if (!mounted) return;
      setState(() {
        _poi = poi;
        _loading = false;
      });
      SupabaseService.trackView(entiteType: 'poi', entiteId: widget.poiId);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _poi = null;
        _loading = false;
      });
    }
  }

  void _showFullImage(String imageUrl) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: EdgeInsets.zero,
        child: GestureDetector(
          onTap: () => Navigator.of(context).pop(),
          child: InteractiveViewer(
            child: Container(
              color: Colors.black,
              child: Center(
                child: CachedNetworkImage(
                  imageUrl: imageUrl,
                  fit: BoxFit.contain,
                  errorWidget: (_, __, ___) =>
                      const Icon(Icons.broken_image, color: Colors.white, size: 80),
                  placeholder: (_, __) => const Center(child: CircularProgressIndicator()),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _stripMarkdown(String text) {
    return text
        .replaceAll(RegExp(r'\*\*([^*]+)\*\*'), r'$1')
        .replaceAll(RegExp(r'\*([^*]+)\*'), r'$1')
        .replaceAll(RegExp(r'_([^_]+)_'), r'$1')
        .replaceAll(RegExp(r'\[(.*?)\]\((.*?)\)'), r'$1')
        .replaceAll(RegExp(r'`([^`]+)`'), r'$1')
        .replaceAll(RegExp(r'^#+\s*', multiLine: true), '')
        .replaceAll(RegExp(r'^>\s*', multiLine: true), '')
        .replaceAll(RegExp(r'^[-*+]\s+', multiLine: true), '')
        .replaceAll(RegExp(r'\!\[(.*?)\]\((.*?)\)'), '')
        .replaceAll(RegExp(r'\n{2,}'), '\n');
  }

  Future<void> _toggleTts() async {
    if (_poi == null) return;
    final locale = LocaleScope.of(context).locale;
    final ttsLang = locale.languageCode == 'en' ? 'en-US' : 'fr-FR';
    final texteTts = _stripMarkdown(_poi!.getTexteTts(locale));
    switch (_ttsState) {
      case _TtsState.stopped:
        setState(() => _ttsState = _TtsState.playing);
        await _tts.setLanguage(ttsLang);
        await _tts.speak(texteTts);
        break;
      case _TtsState.playing:
        await _tts.pause();
        setState(() => _ttsState = _TtsState.paused);
        break;
      case _TtsState.paused:
        setState(() => _ttsState = _TtsState.playing);
        await _tts.setLanguage(ttsLang);
        await _tts.speak(texteTts);
        break;
    }
  }

  Future<void> _stopTts() async {
    await _tts.stop();
    setState(() => _ttsState = _TtsState.stopped);
  }

  @override
  Widget build(BuildContext context) {
    final scope = LocaleScope.of(context);
    final locale = scope.locale;
    final l10n = AppLocalizations(locale);

    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_poi == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: Center(child: Text(l10n.poiNotFound)),
      );
    }

    final poi = _poi!;
    final cfg = getPoiConfig(poi.type);
    final texteResume = poi.getTexteResume(locale);
    final texteComprendre = poi.getTexteComprendre(locale);
    final texteHistorique = poi.getTexteHistorique(locale);
    final texteBible = poi.getTexteBible(locale);

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
                  ? GestureDetector(
                      onTap: () => _showFullImage(poi.photo!),
                      child: CachedNetworkImage(
                        imageUrl: poi.photo!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: const Color(0xFFE7E5E4)),
                        errorWidget: (_, __, ___) => Container(color: const Color(0xFFE7E5E4)),
                      ),
                    )
                  : Container(
                      color: const Color(0xFFF5F5F4),
                      child: Icon(cfg.icon, size: 64, color: cfg.color.withValues(alpha: 0.5)),
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
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: cfg.color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.all(8),
                        child: Icon(cfg.icon, color: cfg.color, size: 28),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          poi.getTitre(locale),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1C1917),
                            height: 1.2,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 12),
                      _TtsIconButton(
                        state: _ttsState,
                        onToggle: _toggleTts,
                        onStop: _stopTts,
                        l10n: l10n,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Sections texte ───────────────────────────────────────
                  if (texteResume != null && texteResume.isNotEmpty) ...[
                    _TextSection(titre: l10n.sectionResume, texte: texteResume),
                    const SizedBox(height: 20),
                  ],
                  if (texteComprendre != null && texteComprendre.isNotEmpty) ...[
                    _TextSection(titre: l10n.sectionComprendre, texte: texteComprendre),
                    const SizedBox(height: 20),
                  ],
                  if (texteHistorique != null && texteHistorique.isNotEmpty) ...[
                    _TextSection(titre: l10n.sectionHistorique, texte: texteHistorique),
                    const SizedBox(height: 20),
                  ],
                  if (texteBible != null && texteBible.isNotEmpty) ...[
                    _BibleSection(titre: l10n.sectionBible, texte: texteBible),
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

class _TtsIconButton extends StatelessWidget {
  final _TtsState state;
  final VoidCallback onToggle;
  final VoidCallback onStop;
  final AppLocalizations l10n;

  const _TtsIconButton({
    required this.state,
    required this.onToggle,
    required this.onStop,
    required this.l10n,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: Icon(
            state == _TtsState.playing
                ? Icons.pause_circle_filled
                : Icons.play_circle_filled,
            color: const Color(0xFF1B4332),
            size: 32,
          ),
          onPressed: onToggle,
          tooltip: state == _TtsState.playing ? l10n.ttsPause : l10n.ttsListen,
        ),
        if (state != _TtsState.stopped)
          IconButton(
            icon: const Icon(Icons.stop_circle, color: Color(0xFF78716C), size: 28),
            onPressed: onStop,
            tooltip: l10n.ttsStop,
          ),
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
        MarkdownBody(
          data: texte,
          styleSheet: MarkdownStyleSheet(
            p: const TextStyle(
              fontSize: 15,
              color: Color(0xFF1C1917),
              height: 1.65,
            ),
          ),
          onTapLink: (text, href, title) async {
            if (href != null) {
              final uri = Uri.tryParse(href);
              if (uri != null) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            }
          },
        ),
      ],
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Section citation biblique
// ──────────────────────────────────────────────────────────────────────────────
class _BibleSection extends StatelessWidget {
  final String titre;
  final String texte;

  const _BibleSection({required this.titre, required this.texte});

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
                Text(
                  titre,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF92400E),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 6),
                MarkdownBody(
                  data: texte,
                  styleSheet: MarkdownStyleSheet(
                    p: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF78350F),
                      fontStyle: FontStyle.italic,
                      height: 1.6,
                    ),
                  ),
                  onTapLink: (text, href, title) async {
                    if (href != null) {
                      final uri = Uri.tryParse(href);
                      if (uri != null) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    }
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

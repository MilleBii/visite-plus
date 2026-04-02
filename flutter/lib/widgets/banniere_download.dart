import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

// TODO: remplacer par les vraies URLs stores
const _appStoreUrl = 'https://apps.apple.com/app/visite-plus/id0000000000';
const _googlePlayUrl = 'https://play.google.com/store/apps/details?id=fr.visite_plus.app';

/// Bannière affichée uniquement sur Flutter Web pour inviter au téléchargement
/// de l'app native. Détecte iOS/Android via le user-agent.
class BanniereDownload extends StatefulWidget {
  const BanniereDownload({super.key});

  @override
  State<BanniereDownload> createState() => _BanniereDownloadState();
}

class _BanniereDownloadState extends State<BanniereDownload> {
  bool _visible = true;
  _Platform? _platform;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      _platform = _detectPlatform();
    }
  }

  @override
  Widget build(BuildContext context) {
    // N'afficher que sur Flutter Web + mobile uniquement
    if (!kIsWeb || !_visible || _platform == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8)],
        border: Border.all(color: const Color(0xFFE7E5E4)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFF1B4332),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.church, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Meilleure expérience sur l\'app',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1C1917)),
                ),
                Text(
                  _platform == _Platform.ios ? 'Disponible sur App Store' : 'Disponible sur Google Play',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF78716C)),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _openStore,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF1B4332),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Télécharger',
                style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () => setState(() => _visible = false),
            child: const Icon(Icons.close, size: 18, color: Color(0xFF78716C)),
          ),
        ],
      ),
    );
  }

  Future<void> _openStore() async {
    final url = _platform == _Platform.ios ? _appStoreUrl : _googlePlayUrl;
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  static _Platform? _detectPlatform() {
    // Sur Flutter Web, on utilise le user agent pour détecter iOS/Android.
    // defaultTargetPlatform reflète la plateforme réelle en web.
    if (defaultTargetPlatform == TargetPlatform.iOS) return _Platform.ios;
    if (defaultTargetPlatform == TargetPlatform.android) return _Platform.android;
    return null; // Desktop → on n'affiche pas la bannière
  }
}

enum _Platform { ios, android }

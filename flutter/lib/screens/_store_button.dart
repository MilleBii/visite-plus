import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

const _googlePlayColor = Color(0xFF34A853);
const _appStoreColor = Colors.black;
class StoreButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final String url;

  const StoreButton({
    required this.label,
    required this.icon,
    required this.url,
  });

  @override
  Widget build(BuildContext context) {
    final isApple = label.toLowerCase().contains('apple') || label.toLowerCase().contains('store');
    final bgColor = label == 'App Store' ? _appStoreColor : _googlePlayColor;
    return ElevatedButton.icon(
      style: ElevatedButton.styleFrom(
        backgroundColor: bgColor,
        foregroundColor: Colors.white,
        elevation: 2,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
      onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
      icon: Icon(icon, size: 22, color: Colors.white),
      label: Text(label, style: const TextStyle(color: Colors.white)),
    );
  }
}
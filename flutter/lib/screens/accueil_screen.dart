import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../models/eglise.dart';
import '../services/supabase_service.dart';
import '../main.dart';
import '../l10n/app_localizations.dart';

import 'dart:async';

class AccueilScreen extends StatefulWidget {
  final String slug;

  const AccueilScreen({super.key, required this.slug});

  @override
  State<AccueilScreen> createState() => _AccueilScreenState();
}

class _AccueilScreenState extends State<AccueilScreen> {
  Eglise? _eglise;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadEglise();
  }

  Future<void> _loadEglise() async {
    try {
      final eglise = await SupabaseService.fetchEgliseBySlug(widget.slug);
      if (!mounted) return;
      if (eglise == null) {
        setState(() {
          _error = 'not_found';
          _loading = false;
        });
        return;
      }
      setState(() {
        _eglise = eglise;
        _loading = false;
      });
      SupabaseService.trackView(entiteType: 'eglise', entiteId: eglise.id);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scope = LocaleScope.of(context);
    final l10n = AppLocalizations.of(context);
    final otherLocale = scope.locale.languageCode == 'fr' ? const Locale('en') : const Locale('fr');
    final otherLangLabel = scope.locale.languageCode == 'fr' ? 'EN' : 'FR';

    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _eglise == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _eglise?.typeIcon ?? Icons.church_outlined,
                size: 48,
                color: const Color(0xFF78716C),
              ),
              const SizedBox(height: 12),
              Text(l10n.churchNotFound),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/'),
                child: Text(l10n.backToMap),
              ),
            ],
          ),
        ),
      );
    }

    final eglise = _eglise!;
    return Scaffold(
      body: Stack(
        children: [
          // Photo façade plein écran
          Positioned.fill(
            child: eglise.photoFacade != null
                ? CachedNetworkImage(
                    imageUrl: eglise.photoFacade!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: const Color(0xFF292524)),
                    errorWidget: (_, __, ___) => Container(color: const Color(0xFF292524)),
                  )
                : Container(color: const Color(0xFF292524)),
          ),

          // Gradient sombre en bas
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.15),
                    Colors.black.withOpacity(0.65),
                    Colors.black.withOpacity(0.88),
                  ],
                  stops: const [0.0, 0.3, 0.65, 1.0],
                ),
              ),
            ),
          ),

          // Bouton sélection langue (haut droite)
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            right: 16,
            child: GestureDetector(
              onTap: () => scope.onLocaleChanged(otherLocale),
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.35),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    otherLangLabel,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Bouton retour carte (haut gauche)
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            child: GestureDetector(
              onTap: () => context.go('/'),
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.35),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.map_outlined, color: Colors.white, size: 18),
              ),
            ),
          ),

          // Contenu bas d'écran
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      eglise.ville.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        letterSpacing: 2,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      eglise.nom,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      eglise.getMessageBienvenue(scope.locale),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Boutons de navigation
                    _NavButton(
                      icon: '✝️',
                      label: l10n.understandChristianity,
                      onTap: () => context.push('/eglise/${eglise.safeSlug}/comprendre'),
                      style: _NavButtonStyle.ghost,
                    ),
                    const SizedBox(height: 10),
                    _NavButtonIcon(
                      iconData: eglise.typeIcon,
                      label: l10n.visitChurch,
                      onTap: () => context.push('/eglise/${eglise.safeSlug}/plan'),
                      style: _NavButtonStyle.primary,
                    ),
                    const SizedBox(height: 10),
                    _NavButton(
                      icon: '📅',
                      label: l10n.schedule,
                      onTap: () => context.push('/eglise/${eglise.safeSlug}/programme'),
                      style: _NavButtonStyle.ghost,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _NavButtonStyle { primary, ghost }

class _NavButton extends StatelessWidget {
  final String icon;
  final String label;
  final VoidCallback onTap;
  final _NavButtonStyle style;

  const _NavButton({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.style,
  });

  @override
  Widget build(BuildContext context) {
    final isPrimary = style == _NavButtonStyle.primary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: isPrimary ? Colors.white : Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isPrimary ? Colors.white : Colors.white.withOpacity(0.3),
          ),
        ),
        child: Row(
          children: [
            Text(icon, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: isPrimary ? const Color(0xFF1B4332) : Colors.white,
                  fontSize: 15,
                  fontWeight: isPrimary ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavButtonIcon extends StatelessWidget {
  final IconData iconData;
  final String label;
  final VoidCallback onTap;
  final _NavButtonStyle style;

  const _NavButtonIcon({
    required this.iconData,
    required this.label,
    required this.onTap,
    required this.style,
  });

  @override
  Widget build(BuildContext context) {
    final isPrimary = style == _NavButtonStyle.primary;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: isPrimary ? Colors.white : Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isPrimary ? Colors.white : Colors.white.withOpacity(0.3),
          ),
        ),
        child: Row(
          children: [
            Icon(iconData, size: 22, color: isPrimary ? const Color(0xFF1B4332) : Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: isPrimary ? const Color(0xFF1B4332) : Colors.white,
                  fontSize: 15,
                  fontWeight: isPrimary ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

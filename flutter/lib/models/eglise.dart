import 'package:flutter/material.dart';
import '../l10n/i18n_field.dart';

class Eglise {
  final int id;
  final String nom;
  final String ville;
  final String type; // 'église' | 'sanctuaire' | 'cathédrale'
  final String slug;
  final double latitude;
  final double longitude;
  final String? photoFacade;
  final String? planImage;
  final String? googleCalendarIdMesses;
  final String? googleCalendarIdEvenements;
  final String? osmFootprintJson;
  final double osmRotationAngle;

  final dynamic _messageBienvenue;

  const Eglise({
    required this.id,
    required this.nom,
    required this.ville,
    required this.type,
    required this.slug,
    required this.latitude,
    required this.longitude,
    this.photoFacade,
    dynamic messageBienvenue,
    this.planImage,
    this.googleCalendarIdMesses,
    this.googleCalendarIdEvenements,
    this.osmFootprintJson,
    this.osmRotationAngle = 0,
  }) : _messageBienvenue = messageBienvenue;

  String getMessageBienvenue(Locale locale) {
    if (_messageBienvenue == null) {
      return locale.languageCode == 'en'
          ? 'Believer or not, welcome to this church!'
          : 'Croyant ou non, bienvenue dans cette église !';
    }
    return resolveI18n(_messageBienvenue, locale);
  }

  /// Slug robuste pour la navigation (fallback si valeur vide en base/cache).
  String get safeSlug {
    final trimmed = slug.trim();
    if (trimmed.isNotEmpty) return trimmed;
    return _toSlug(nom);
  }

  factory Eglise.fromJson(Map<String, dynamic> json) {
    final position = json['position'] as List<dynamic>?;
    final rawSlug = (json['slug'] as String?)?.trim();
    try {
      final eglise = Eglise(
        id: json['id'] as int,
        nom: json['nom'] as String,
        ville: json['ville'] as String,
        type: json['type'] as String,
        slug: (rawSlug == null || rawSlug.isEmpty)
            ? _toSlug(json['nom'] as String)
            : rawSlug,
        latitude: position != null
            ? (position[0] as num).toDouble()
            : (json['latitude'] as num?)?.toDouble() ?? 0.0,
        longitude: position != null
            ? (position[1] as num).toDouble()
            : (json['longitude'] as num?)?.toDouble() ?? 0.0,
        photoFacade: json['photo_facade'] as String?,
        messageBienvenue: json['message_bienvenue'],
        planImage: json['plan_image'] as String?,
        googleCalendarIdMesses: json['google_calendar_id_messes'] as String?,
        googleCalendarIdEvenements: json['google_calendar_id_evenements'] as String?,
        osmFootprintJson: json['osm_footprint_json'] as String?,
        osmRotationAngle: (json['osm_rotation_angle'] as num?)?.toDouble() ?? 0,
      );
      // ignore: avoid_print
      print('✓ Parsed Eglise: ${eglise.nom} at (${eglise.latitude}, ${eglise.longitude})');
      return eglise;
    } catch (e) {
      // ignore: avoid_print
      print('❌ Error parsing Eglise: $e from $json');
      rethrow;
    }
  }

  static String _toSlug(String nom) {
    return nom
        .toLowerCase()
        .replaceAll(RegExp(r'[àâä]'), 'a')
        .replaceAll(RegExp(r'[éèêë]'), 'e')
        .replaceAll(RegExp(r'[îï]'), 'i')
        .replaceAll(RegExp(r'[ôö]'), 'o')
        .replaceAll(RegExp(r'[ùûü]'), 'u')
        .replaceAll(RegExp(r'[^a-z0-9]'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
  }

  IconData get typeIcon {
    switch (type.toLowerCase()) {
      case 'cathédrale':
        return Icons.church;
      case 'basilique':
        return Icons.account_balance_rounded;
      case 'sanctuaire':
        return Icons.spa;
      case 'église':
        return Icons.account_balance;
      default:
        return Icons.location_on;
    }
  }
}

import 'package:flutter/material.dart';
import '../l10n/i18n_field.dart';

class Poi {
  final int id;
  final int egliseId;
  final String type; // 'vitrail' | 'statue' | 'tableau' | 'demarche'
  final double positionX;
  final double positionY;
  final String? photo;
  final int photoX;
  final int photoY;

  final dynamic _titre;
  final dynamic _texteResume;
  final dynamic _texteComprendre;
  final dynamic _texteHistorique;
  final dynamic _texteBible;

  const Poi({
    required this.id,
    required this.egliseId,
    required this.type,
    required dynamic titre,
    required this.positionX,
    required this.positionY,
    this.photo,
    this.photoX = 50,
    this.photoY = 50,
    dynamic texteResume,
    dynamic texteComprendre,
    dynamic texteHistorique,
    dynamic texteBible,
  })  : _titre = titre,
        _texteResume = texteResume,
        _texteComprendre = texteComprendre,
        _texteHistorique = texteHistorique,
        _texteBible = texteBible;

  String getTitre(Locale locale) => resolveI18n(_titre, locale);
  String? getTexteResume(Locale locale) => resolveI18nNullable(_texteResume, locale);
  String? getTexteComprendre(Locale locale) => resolveI18nNullable(_texteComprendre, locale);
  String? getTexteHistorique(Locale locale) => resolveI18nNullable(_texteHistorique, locale);
  String? getTexteBible(Locale locale) => resolveI18nNullable(_texteBible, locale);

  String getTexteTts(Locale locale) {
    final parts = <String>[];
    final r = getTexteResume(locale);
    final c = getTexteComprendre(locale);
    final h = getTexteHistorique(locale);
    final b = getTexteBible(locale);
    if (r != null && r.isNotEmpty) parts.add(r);
    if (c != null && c.isNotEmpty) parts.add(c);
    if (h != null && h.isNotEmpty) parts.add(h);
    if (b != null && b.isNotEmpty) parts.add(b);
    return parts.join('\n\n');
  }

  factory Poi.fromJson(Map<String, dynamic> json) {
    final position = json['position'] as List<dynamic>?;
    return Poi(
      id: json['id'] as int,
      egliseId: json['eglise_id'] as int,
      type: json['type'] as String,
      titre: json['titre'],
      positionX: position != null
          ? (position[0] as num).toDouble()
          : (json['position_x'] as num).toDouble(),
      positionY: position != null
          ? (position[1] as num).toDouble()
          : (json['position_y'] as num).toDouble(),
      photo: json['photo'] as String?,
      photoX: (json['photo_x'] as int?) ?? 50,
      photoY: (json['photo_y'] as int?) ?? 50,
      texteResume: json['texte_resume'],
      texteComprendre: json['texte_comprendre'],
      texteHistorique: json['texte_historique'],
      texteBible: json['texte_bible'],
    );
  }
}

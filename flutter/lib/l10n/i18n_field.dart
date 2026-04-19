import 'dart:convert';
import 'package:flutter/material.dart';

/// Resolves a potentially multilingual Supabase field.
/// Fields may be stored as JSONB {"fr": "...", "en": "..."} or as plain strings.
/// Falls back to French, then to first available value.
String resolveI18n(dynamic raw, Locale locale) {
  if (raw == null) return '';

  Map<String, dynamic>? map;
  if (raw is Map) {
    map = Map<String, dynamic>.from(raw);
  } else if (raw is String && raw.trimLeft().startsWith('{')) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) map = Map<String, dynamic>.from(decoded);
    } catch (_) {}
  }

  if (map == null) return raw is String ? raw : raw.toString();

  final lang = locale.languageCode;
  return (map[lang] ?? map['fr'] ?? map.values.firstOrNull)?.toString() ?? '';
}

/// Same as [resolveI18n] but returns null if the field is absent or empty.
String? resolveI18nNullable(dynamic raw, Locale locale) {
  if (raw == null) return null;
  final result = resolveI18n(raw, locale);
  return result.isEmpty ? null : result;
}

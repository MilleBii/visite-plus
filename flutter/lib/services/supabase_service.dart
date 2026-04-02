import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/eglise.dart';
import '../models/poi.dart';
import '../models/evenement.dart';
import '../models/question.dart';

class SupabaseService {
  static final _client = Supabase.instance.client;

  // ── Églises ────────────────────────────────────────────────────────────────

  static Future<List<Eglise>> fetchEglises() async {
    final response = await _client
        .from('eglises')
        .select('*')
        .order('nom');
    return (response as List).map((e) => Eglise.fromJson(e)).toList();
  }

  static Future<Eglise?> fetchEgliseBySlug(String slug) async {
    // Pas de colonne slug en BDD : on charge toutes les églises et on filtre par slug calculé
    final all = await fetchEglises();
    try {
      return all.firstWhere((e) => e.slug == slug);
    } catch (_) {
      return all.isNotEmpty ? all.first : null;
    }
  }

  static Future<Eglise?> fetchEgliseById(int id) async {
    final response = await _client
        .from('eglises')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (response == null) return null;
    return Eglise.fromJson(response);
  }

  // ── POIs ───────────────────────────────────────────────────────────────────

  static Future<List<Poi>> fetchPois(int egliseId) async {
    final response = await _client
        .from('pois')
        .select('*')
        .eq('eglise_id', egliseId)
        .order('id');
    return (response as List).map((e) => Poi.fromJson(e)).toList();
  }

  static Future<Poi?> fetchPoiById(int poiId) async {
    final response = await _client
        .from('pois')
        .select('*')
        .eq('id', poiId)
        .maybeSingle();
    if (response == null) return null;
    return Poi.fromJson(response);
  }

  // ── Événements ─────────────────────────────────────────────────────────────

  static Future<List<Evenement>> fetchEvenements(int egliseId) async {
    final response = await _client
        .from('evenements')
        .select('*')
        .eq('eglise_id', egliseId)
        .gte('date', DateTime.now().toIso8601String().substring(0, 10))
        .order('date')
        .order('heure');
    return (response as List).map((e) => Evenement.fromJson(e)).toList();
  }

  // ── Questions "Comprendre la religion" ─────────────────────────────────────

  static Future<List<Question>> fetchQuestions() async {
    final response = await _client
        .from('questions')
        .select('*')
        .order('id');
    return (response as List).map((e) => Question.fromJson(e)).toList();
  }

  // ── Stats (fire-and-forget) ─────────────────────────────────────────────────

  static void trackView({required String entiteType, required int entiteId}) {
    // Appel RPC fire-and-forget — la fonction Postgres gère l'upsert atomique
    // (INSERT … ON CONFLICT DO UPDATE SET count = count + 1).
    // Le slot est tronqué à l'heure côté serveur via date_trunc('hour', now()).
    _client.rpc('track_view', params: {
      'p_entite_type': entiteType,
      'p_entite_id': entiteId,
    }).then((_) {}).catchError((_) {});
  }
}

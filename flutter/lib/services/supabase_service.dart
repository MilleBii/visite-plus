import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/eglise.dart';
import '../models/poi.dart';
import '../models/evenement.dart';
import '../models/question.dart';

class SupabaseService {
  static final _client = Supabase.instance.client;

  // ── Cache local simple ──────────────────────────────────────────────────────
  static final Map<String, dynamic> _cache = {};
  static final Map<String, DateTime> _cacheTime = {};

  // TTL du cache en secondes (5 minutes pour les églises, 30 min pour questions)
  static const int _ttlEglises = 300;
  static const int _ttlQuestions = 1800;

  static bool _isCacheValid(String key, int ttlSeconds) {
    if (!_cacheTime.containsKey(key)) return false;
    final elapsed = DateTime.now().difference(_cacheTime[key]!).inSeconds;
    return elapsed < ttlSeconds;
  }

  static void _setCacheEntry(String key, dynamic value) {
    _cache[key] = value;
    _cacheTime[key] = DateTime.now();
  }

  // ── Églises ────────────────────────────────────────────────────────────────

  /// Récupère toutes les églises, triées par nom
  /// (DEBUG: pas de filtre statut pendant le dev)
  /// Utilise un cache de 5 minutes
  static Future<List<Eglise>> fetchEglises({bool ignoreCache = false}) async {
    const cacheKey = 'eglises_all';

    if (!ignoreCache && _isCacheValid(cacheKey, _ttlEglises)) {
      final cached = (_cache[cacheKey] as List<Eglise>?) ?? [];
      // ignore: avoid_print
      print('✓ Eglises from cache: ${cached.length} items');
      return cached;
    }

    try {
      // ignore: avoid_print
      print('🔄 Fetching eglises from Supabase...');
      
      // TEMP DEV: sans filtre statut pour tester avec les brouillons
      // EN PROD: remetre .eq('statut', 'publié')
      final response = await _client
          .from('eglises')
          .select('*')
          .order('nom');
      
      final eglises = (response as List).map((e) => Eglise.fromJson(e as Map<String, dynamic>)).toList();
      
      // ignore: avoid_print
      print('✅ Fetched ${eglises.length} eglises');
      
      _setCacheEntry(cacheKey, eglises);
      return eglises;
    } catch (e) {
      // ignore: avoid_print
      print('❌ Erreur fetchEglises: $e');
      // Retourner le cache même expiré en cas d'erreur
      return (_cache[cacheKey] as List<Eglise>?) ?? [];
    }
  }

  /// Récupère une église par son slug
  /// Lecture directe DB pour éviter les valeurs obsolètes du cache
  /// (ex: angle de rotation modifié depuis le BO).
  static Future<Eglise?> fetchEgliseBySlug(String slug) async {
    final wanted = slug.trim().toLowerCase();

    try {
      // Chemin nominal: slug stocké en base.
      final response = await _client
          .from('eglises')
          .select('*')
          .eq('slug', wanted)
          .maybeSingle();

      if (response != null) {
        return Eglise.fromJson(response);
      }
    } catch (e) {
      print('Info fetchEgliseBySlug direct DB: $e');
    }

    // Fallback legacy: compatibilité avec anciennes données/caches.
    try {
      final all = await fetchEglises(ignoreCache: true);
      return all.firstWhere((e) => e.safeSlug.toLowerCase() == wanted);
    } catch (e) {
      print('Erreur fetchEgliseBySlug fallback: $e');
      return null;
    }
  }

  /// Récupère une église par son ID
  static Future<Eglise?> fetchEgliseById(int id) async {
    try {
      final response = await _client
          .from('eglises')
          .select('*')
          .eq('id', id)
          .eq('statut', 'publié')
          .maybeSingle();
      
      if (response == null) return null;
      return Eglise.fromJson(response);
    } catch (e) {
      print('Erreur fetchEgliseById: $e');
      return null;
    }
  }

  // ── POIs ───────────────────────────────────────────────────────────────────

  /// Récupère tous les POIs d'une église
  static Future<List<Poi>> fetchPois(int egliseId) async {
    try {
      final response = await _client
          .from('pois')
          .select('*')
          .eq('eglise_id', egliseId)
          .order('id');
      
      return (response as List).map((e) => Poi.fromJson(e)).toList();
    } catch (e) {
      print('Erreur fetchPois: $e');
      return [];
    }
  }

  /// Récupère un POI spécifique
  static Future<Poi?> fetchPoiById(int poiId) async {
    try {
      final response = await _client
          .from('pois')
          .select('*')
          .eq('id', poiId)
          .maybeSingle();
      
      if (response == null) return null;
      return Poi.fromJson(response);
    } catch (e) {
      print('Erreur fetchPoiById: $e');
      return null;
    }
  }

  // ── Événements ─────────────────────────────────────────────────────────────

  /// Récupère les événements à venir à partir d'aujourd'hui
  /// Sources : table evenements (stockées en BD) + Google Calendar (temps réel)
  static Future<List<Evenement>> fetchEvenements(int egliseId) async {
    try {
      final eglise = await fetchEgliseById(egliseId);
      if (eglise == null) return [];

      // Récupérer les événements stockés en BD
      final evenementsBd = await _fetchEvenementsFromDb(egliseId);

      // Si l'église a un Google Calendar ID, récupérer aussi depuis Google Calendar
      if (eglise.googleCalendarId != null && eglise.googleCalendarId!.isNotEmpty) {
        final evenementsGCal = await _fetchEvenementsFromGoogleCalendar(eglise.googleCalendarId!);
        // Fusionner et dédupliquer les événements
        return _mergeEvenements(evenementsBd, evenementsGCal);
      }

      return evenementsBd;
    } catch (e) {
      print('Erreur fetchEvenements: $e');
      return [];
    }
  }

  /// Récupère les événements depuis la table evenements
  static Future<List<Evenement>> _fetchEvenementsFromDb(int egliseId) async {
    try {
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final response = await _client
          .from('evenements')
          .select('*')
          .eq('eglise_id', egliseId)
          .gte('date', today)
          .order('date')
          .order('heure');
      
      return (response as List).map((e) => Evenement.fromJson(e)).toList();
    } catch (e) {
      print('Erreur _fetchEvenementsFromDb: $e');
      return [];
    }
  }

  /// Récupère les événements depuis Google Calendar via une Edge Function
  /// La fonction RPC retourne les événements au format standard
  static Future<List<Evenement>> _fetchEvenementsFromGoogleCalendar(String googleCalendarId) async {
    try {
      // Appel RPC à une Edge Function qui récupère desde Google Calendar API
      // La fonction RPC retourne une liste de JSON pour éviter les appels client directs
      final response = await _client.rpc('get_google_calendar_events', params: {
        'p_calendar_id': googleCalendarId,
      });

      if (response == null || response is! List) return [];

      return (response as List)
          .map((e) => Evenement.fromGoogleCalendar(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      // La Edge Function n'existe peut-être pas encore ou le calendrier n'est pas accessible
      // On continue sans erreur critique
      print('Info: Google Calendar non accessible ($googleCalendarId) : $e');
      return [];
    }
  }

  /// Fusionne les événements de plusieurs sources et déduplique
  static List<Evenement> _mergeEvenements(
    List<Evenement> evenementsBd,
    List<Evenement> evenementsGCal,
  ) {
    final merged = <String, Evenement>{};

    for (final evt in evenementsBd) {
      merged[evt.id] = evt;
    }

    for (final evt in evenementsGCal) {
      // Éviter les doublons en comparant titre + dateTime
      final isDuplicate = merged.values.any((e) =>
          e.titre.toLowerCase() == evt.titre.toLowerCase() &&
          e.dateHeure.difference(evt.dateHeure).inMinutes.abs() < 5);

      if (!isDuplicate) {
        merged[evt.id] = evt;
      }
    }

    // Trier par date
    final result = merged.values.toList();
    result.sort((a, b) => a.dateHeure.compareTo(b.dateHeure));
    return result;
  }

  // ── Questions "Comprendre la religion" ─────────────────────────────────────

  /// Récupère les questions / réponses (cache 30 min)
  static Future<List<Question>> fetchQuestions({bool ignoreCache = false}) async {
    const cacheKey = 'questions_all';

    if (!ignoreCache && _isCacheValid(cacheKey, _ttlQuestions)) {
      return (_cache[cacheKey] as List<Question>?) ?? [];
    }

    try {
      final response = await _client
          .from('questions')
          .select('*')
          .order('id');
      
      final questions = (response as List).map((e) => Question.fromJson(e)).toList();
      _setCacheEntry(cacheKey, questions);
      return questions;
    } catch (e) {
      print('Erreur fetchQuestions: $e');
      // Retourner le cache même expiré en cas d'erreur
      return (_cache[cacheKey] as List<Question>?) ?? [];
    }
  }

  // ── Stats de consultation ──────────────────────────────────────────────────

  /// Enregistre une consultation via la fonction RPC track_view
  /// Fire-and-forget : l'app n'attend pas la réponse
  /// Le slot et l'incrémentation sont gérés côté serveur (atomique)
  static void trackView({required String entiteType, required int entiteId}) {
    _client.rpc('track_view', params: {
      'p_entite_type': entiteType,
      'p_entite_id': entiteId,
    }).then((_) {
      // Succès silencieux
    }).catchError((e) {
      print('Erreur trackView: $e');
      // Erreur silencieuse : on ne bloque pas l'UX
    });
  }

  // ── Utilitaires ────────────────────────────────────────────────────────────

  /// Invalide les entrées du cache
  static void clearCache({String? pattern}) {
    if (pattern == null) {
      _cache.clear();
      _cacheTime.clear();
    } else {
      _cache.removeWhere((k, _) => k.contains(pattern));
      _cacheTime.removeWhere((k, _) => k.contains(pattern));
    }
  }

  /// Retourne l'état du cache (debug)
  static Map<String, dynamic> getCacheStats() {
    return {
      'entries': _cache.length,
      'keys': _cache.keys.toList(),
    };
  }
}

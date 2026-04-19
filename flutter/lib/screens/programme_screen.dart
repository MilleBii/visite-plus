import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/evenement.dart';
import '../services/supabase_service.dart';
import '../config/type_config.dart';
import '../main.dart';
import '../l10n/app_localizations.dart';

class ProgrammeScreen extends StatefulWidget {
  final String slug;

  const ProgrammeScreen({super.key, required this.slug});

  @override
  State<ProgrammeScreen> createState() => _ProgrammeScreenState();
}

class _ProgrammeScreenState extends State<ProgrammeScreen> {
  List<Evenement> _evenements = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final eglise = await SupabaseService.fetchEgliseBySlug(widget.slug);
      if (!mounted) return;
      if (eglise == null) {
        setState(() { _error = 'not_found'; _loading = false; });
        return;
      }
      final evenements = await SupabaseService.fetchEvenements(eglise.id);
      if (!mounted) return;
      setState(() {
        _evenements = evenements;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Map<String, List<Evenement>> _groupedForLocale(AppLocalizations l10n) {
    final map = <String, List<Evenement>>{};
    for (final e in _evenements) {
      final key = DateFormat(l10n.datePattern, l10n.dateLocale).format(e.dateHeure);
      map.putIfAbsent(key, () => []).add(e);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations(LocaleScope.of(context).locale);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAF9),
      appBar: AppBar(
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: Text(l10n.schedule),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: ColoredBox(
            color: Color(0xFFE7E5E4),
            child: SizedBox(height: 1, width: double.infinity),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error == 'not_found' ? l10n.churchNotFound : _error!))
              : _evenements.isEmpty
                  ? _EmptyState(l10n: l10n)
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        for (final entry in _groupedForLocale(l10n).entries) ...[
                          _DateHeader(date: entry.key),
                          ...entry.value.map((e) => _EvenementCard(evenement: e)),
                          const SizedBox(height: 8),
                        ],
                      ],
                    ),
    );
  }
}

class _DateHeader extends StatelessWidget {
  final String date;

  const _DateHeader({required this.date});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Text(
        _capitalize(date),
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: Color(0xFF78716C),
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  String _capitalize(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

class _EvenementCard extends StatelessWidget {
  final Evenement evenement;

  const _EvenementCard({required this.evenement});

  @override
  Widget build(BuildContext context) {
    final lang = LocaleScope.of(context).locale.languageCode;
    final cfg = getEvenementConfig(evenement.type);
    final heure = DateFormat('HH\'h\'mm').format(evenement.dateHeure).replaceAll('h00', 'h');

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE7E5E4)),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 44,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: cfg.color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          SizedBox(
            width: 42,
            child: Text(
              heure,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: cfg.color,
              ),
            ),
          ),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: cfg.backgroundColor,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        cfg.getLabel(lang),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: cfg.color,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  evenement.titre,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1C1917),
                  ),
                ),
                if (evenement.description != null && evenement.description!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    evenement.description!,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF78716C)),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final AppLocalizations l10n;

  const _EmptyState({required this.l10n});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.calendar_today_outlined, size: 48, color: Color(0xFFD6D3D1)),
          const SizedBox(height: 12),
          Text(
            l10n.noEvents,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF78716C)),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.comeBackSoon,
            style: const TextStyle(fontSize: 14, color: Color(0xFFA8A29E)),
          ),
        ],
      ),
    );
  }
}

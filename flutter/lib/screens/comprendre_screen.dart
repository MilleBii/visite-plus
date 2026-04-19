import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/question.dart';
import '../services/supabase_service.dart';
import '../main.dart';
import '../l10n/app_localizations.dart';

class ComprendreScreen extends StatefulWidget {
  final String slug;

  const ComprendreScreen({super.key, required this.slug});

  @override
  State<ComprendreScreen> createState() => _ComprendreScreenState();
}

class _ComprendreScreenState extends State<ComprendreScreen> {
  List<Question> _questions = [];
  bool _loading = true;
  int? _expanded;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final questions = await SupabaseService.fetchQuestions();
    if (!mounted) return;
    setState(() {
      _questions = questions;
      _loading = false;
    });
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
        title: Text(l10n.understandReligion),
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
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20, top: 4),
                    child: Text(
                      l10n.faq,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF78716C),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  ..._questions.map((q) => _QuestionCard(
                        question: q,
                        isExpanded: _expanded == q.id,
                        onToggle: () => setState(
                          () => _expanded = _expanded == q.id ? null : q.id,
                        ),
                      )),
                ],
              ),
            ),
    );
  }
}

class _QuestionCard extends StatelessWidget {
  final Question question;
  final bool isExpanded;
  final VoidCallback onToggle;

  const _QuestionCard({
    required this.question,
    required this.isExpanded,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final locale = LocaleScope.of(context).locale;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isExpanded ? const Color(0xFF1B4332) : const Color(0xFFE7E5E4),
          width: isExpanded ? 1.5 : 1,
        ),
        boxShadow: isExpanded
            ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2))]
            : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          question.getQuestion(locale),
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: isExpanded
                                ? const Color(0xFF1B4332)
                                : const Color(0xFF1C1917),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      AnimatedRotation(
                        turns: isExpanded ? 0.5 : 0,
                        duration: const Duration(milliseconds: 200),
                        child: Icon(
                          Icons.keyboard_arrow_down,
                          color: isExpanded ? const Color(0xFF1B4332) : const Color(0xFF78716C),
                        ),
                      ),
                    ],
                  ),
                  AnimatedSize(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeInOut,
                    child: isExpanded
                        ? Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Text(
                              question.getReponse(locale),
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF44403C),
                                height: 1.6,
                              ),
                            ),
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

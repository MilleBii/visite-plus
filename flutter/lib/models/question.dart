import 'package:flutter/material.dart';
import '../l10n/i18n_field.dart';

class Question {
  final int id;
  final dynamic _question;
  final dynamic _reponse;

  const Question({
    required this.id,
    required dynamic question,
    required dynamic reponse,
  })  : _question = question,
        _reponse = reponse;

  String getQuestion(Locale locale) => resolveI18n(_question, locale);
  String getReponse(Locale locale) => resolveI18n(_reponse, locale);

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as int,
      question: json['question'],
      reponse: json['reponse'],
    );
  }
}

class Question {
  final int id;
  final String question;
  final String reponse;

  const Question({
    required this.id,
    required this.question,
    required this.reponse,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['id'] as int,
      question: json['question'] as String,
      reponse: json['reponse'] as String,
    );
  }
}

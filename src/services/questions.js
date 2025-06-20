const hasQuestionService = (session) => {
	return session.paidServices?.some(
		(s) => s.id === 'single_question' && (session.questionCount || 0) < 1
	);
};

module.exports = { hasQuestionService };

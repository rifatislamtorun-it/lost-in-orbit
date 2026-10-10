import { QUIZZES } from '../data/quizzes.js';
export class QuizManager {
  constructor(game) { this.g = game; }
  get(id) { return QUIZZES[id]; }
  /** Record an answer; correct = +10 science points, a wrong answer still earns +3 for trying. */
  answer(id, idx) {
    const q = QUIZZES[id], correct = idx === q.answer, s = this.g.score;
    s.quizTotal++; if (correct) s.quizCorrect++; s.quizDone.push({ id, correct });
    const pts = correct ? 10 : 3; s.science += pts; s.points += pts;
    if (s.quizCorrect >= 5) this.g.unlock('science_explorer');
    return { correct, pts };
  }
}

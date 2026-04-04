import { expect } from 'chai';
import { extractExerciseScore, buildExerciseSystemPrompt } from '../services/exercise-embed.service';

describe('extractExerciseScore', () => {
  it('parses EXERCISE_SCORE JSON from assistant message', () => {
    const text = 'Great effort!\nEXERCISE_SCORE: {"rawScore": 5, "normalizedScore": 62.5, "feedback": "Nice work!"}';
    const result = extractExerciseScore(text);
    expect(result).to.not.be.null;
    expect(result!.rawScore).to.equal(5);
    expect(result!.normalizedScore).to.equal(62.5);
    expect(result!.feedback).to.equal('Nice work!');
  });

  it('strips the EXERCISE_SCORE line from cleanText', () => {
    const text = 'Great job!\nEXERCISE_SCORE: {"rawScore": 3, "normalizedScore": 60, "feedback": "Good!"}';
    const result = extractExerciseScore(text);
    expect(result!.cleanText).to.equal('Great job!');
    expect(result!.cleanText).to.not.include('EXERCISE_SCORE');
  });

  it('returns null when no EXERCISE_SCORE marker is present', () => {
    expect(extractExerciseScore('Just a regular response.')).to.be.null;
  });

  it('returns null for malformed JSON in the marker', () => {
    const text = 'EXERCISE_SCORE: {not valid json}';
    expect(extractExerciseScore(text)).to.be.null;
  });

  it('handles score at start of string', () => {
    const text = 'EXERCISE_SCORE: {"rawScore": 0, "normalizedScore": 0, "feedback": "Keep trying!"}';
    const result = extractExerciseScore(text);
    expect(result).to.not.be.null;
    expect(result!.cleanText).to.equal('');
  });
});

describe('buildExerciseSystemPrompt', () => {
  it('wraps the fragment with ACTIVE EXERCISE markers', () => {
    const fragment = 'EXERCISE: say these words';
    const prompt = buildExerciseSystemPrompt(fragment);
    expect(prompt).to.include('--- ACTIVE EXERCISE ---');
    expect(prompt).to.include(fragment);
    expect(prompt).to.include('--- END EXERCISE ---');
  });
});

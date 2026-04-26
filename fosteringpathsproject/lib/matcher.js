// Quiz matching logic. Returns { topId, altIds, reasoning }.
// Scores every career against the user's 4 answers and explains the top hit
// in plain language so the result feels earned, not random.

window.matchCareer = function (answers) {
  const careers = window.CAREERS.all();
  const interestPick = answers.interest;
  const speedPick = answers.speed;
  const schoolPick = answers.school;

  const scored = careers.map(c => {
    let score = 0;
    const reasons = [];

    // Interest match
    if (c.interests && c.interests.includes(interestPick)) {
      score += 10;
      reasons.push("interest");
    }

    // Speed match
    const cBucket = c.lengthBucket || 'mid';
    if (cBucket === speedPick) {
      score += 6;
      reasons.push("speed");
    } else if (
      (speedPick === "fast" && cBucket === "mid") ||
      (speedPick === "long" && cBucket === "mid") ||
      (speedPick === "mid")
    ) {
      score += 2;
    }

    // School preference
    if (schoolPick === "done" && cBucket === "fast") score += 4;
    if (schoolPick === "done" && c.id === "trades") score += 6;
    if (schoolPick === "love" && cBucket === "long") score += 3;
    if (schoolPick === "ok") score += 1;

    return { c, score, reasons };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const alts = scored.slice(1, 3).filter(s => s.score > 0).map(s => s.c.id);

  // Build the human reasoning string
  const interestLabels = {
    helping: "you want to help people directly",
    building: "you like building or fixing things",
    numbers: "you're drawn to patterns and problem-solving",
    art: "you love making and designing things",
    words: "writing pulls you in",
    outdoors: "you'd rather be moving and hands-on",
  };
  const speedLabels = {
    fast: "wanting to start earning quickly",
    mid: "being okay with a few years of school",
    long: "being willing to go all the way",
  };
  const schoolLabels = {
    love: "you like school",
    ok: "you'll do what's needed",
    done: "you're done with classrooms",
  };

  const parts = [];
  if (top.reasons.includes("interest") && interestLabels[interestPick]) {
    parts.push(interestLabels[interestPick]);
  }
  if (top.reasons.includes("speed") && speedLabels[speedPick]) {
    parts.push(speedLabels[speedPick]);
  }
  if (schoolLabels[schoolPick]) {
    parts.push(schoolLabels[schoolPick]);
  }

  let reasoning;
  if (parts.length === 0) {
    reasoning = `${top.c.name} is the closest match across what you told us.`;
  } else if (parts.length === 1) {
    reasoning = `You said ${parts[0]} — that lines up with ${top.c.name}.`;
  } else {
    const last = parts.pop();
    reasoning = `You said ${parts.join(", ")}, and ${last}. ${top.c.name} hits all of those.`;
  }

  return {
    topId: top.c.id,
    altIds: alts,
    reasoning,
  };
};

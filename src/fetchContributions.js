const QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

// GitHub's API caps a single window at ~1 year, so we fetch the last
// 365 days each run. Older days already in index.json are kept as-is -
// that's how the tree accumulates history beyond one year.
export async function fetchContributions({ login, token, days = 365 }) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { login, from: from.toISOString(), to: to.toISOString() },
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;
  const days_ = [];
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      days_.push({ date: day.date, count: day.contributionCount });
    }
  }
  return days_;
}

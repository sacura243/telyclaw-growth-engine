/**
 * Sanity check for the ranking engine. Run: npm run check
 * Prints the trend table for each window so we can eyeball whether the
 * scoring behaves like a growth person would expect, not like a random number generator.
 */
import { CORPUS_END } from '../src/data/seed'
import { postsUntil } from '../src/data/corpus'
import { buildTrends, clusterPosts } from '../src/lib/detect'

const posts = postsUntil(CORPUS_END)
const { assignments, accuracy } = clusterPosts(posts)

console.log(`corpus: ${posts.length} posts`)
console.log(
  `clustering accuracy: ${((accuracy.correct / Math.max(1, accuracy.total)) * 100).toFixed(1)}% (${accuracy.correct}/${accuracy.total}), unassigned ${accuracy.unassigned}`,
)

for (const windowHours of [1, 4, 24, 168]) {
  const trends = buildTrends({
    posts,
    assignments,
    now: CORPUS_END,
    windowHours,
    performance: {},
  })
  console.log(`\n--- window ${windowHours}h ---`)
  for (const t of trends) {
    const b = t.breakdown
    console.log(
      [
        String(t.score.toFixed(1)).padStart(5),
        t.stage.padEnd(9),
        String(t.stats.posts).padStart(3),
        'posts',
        `${(t.stats.velocityRatio).toFixed(2)}x`,
        `v=${b.velocity.toFixed(2)}`,
        `m=${b.momentum.toFixed(2)}`,
        `f=${b.freshness.toFixed(2)}`,
        `r=${b.relevance.toFixed(2)}`,
        `c=${b.contentOpportunity.toFixed(2)}`,
        `dup=${t.stats.duplicateRatio.toFixed(2)}`,
        `lead=${t.leadTimeMin ?? '-'}`,
        t.nameZh,
      ].join(' '),
    )
  }
}

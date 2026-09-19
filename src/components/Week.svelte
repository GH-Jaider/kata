<script>
  let { week } = $props();
</script>
<div class="week" role="img" aria-label={`${week.done} of ${week.goal} days this week`}>
  {#each week.days as d}<i class:on={d.done} class:today={d.today}></i>{/each}
</div>

import { Component, input, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { VoteStats } from '../../models/game.models';

@Component({
  selector: 'app-voting-results',
  templateUrl: './voting-results.component.html',
  styleUrl: './voting-results.component.css',
  imports: [DecimalPipe],
})
export class VotingResultsComponent {
  stats = input.required<VoteStats | null>();

  maxCount = computed(() => {
    const s = this.stats();
    if (!s) return 1;
    return Math.max(...s.distribution.map(d => d.count), 1);
  });
}

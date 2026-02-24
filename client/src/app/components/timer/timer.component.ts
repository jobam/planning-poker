import { Component, signal, computed, output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.css',
})
export class TimerComponent implements OnDestroy {
  timeLeft = signal(30);
  isRunning = signal(false);
  totalTime = signal(30);
  timerComplete = output<void>();

  private intervalId: ReturnType<typeof setInterval> | null = null;

  formattedTime = computed(() => {
    const t = this.timeLeft();
    const minutes = Math.floor(t / 60);
    const seconds = t % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  progress = computed(() => {
    const total = this.totalTime();
    if (total === 0) return 0;
    return ((total - this.timeLeft()) / total) * 100;
  });

  isComplete = computed(() => this.timeLeft() === 0);

  start(): void {
    if (this.isRunning() || this.isComplete()) return;
    this.isRunning.set(true);
    this.intervalId = setInterval(() => {
      const current = this.timeLeft();
      if (current <= 1) {
        this.timeLeft.set(0);
        this.isRunning.set(false);
        this.clearInterval();
        this.timerComplete.emit();
      } else {
        this.timeLeft.set(current - 1);
      }
    }, 1000);
  }

  pause(): void {
    this.isRunning.set(false);
    this.clearInterval();
  }

  reset(): void {
    this.clearInterval();
    this.isRunning.set(false);
    this.timeLeft.set(this.totalTime());
  }

  addTime(seconds: number): void {
    const newTime = this.timeLeft() + seconds;
    this.timeLeft.set(newTime);
    if (this.totalTime() < newTime) {
      this.totalTime.set(newTime);
    }
  }

  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }
}

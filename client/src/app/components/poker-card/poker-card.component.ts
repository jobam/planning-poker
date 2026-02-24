import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-poker-card',
  templateUrl: './poker-card.component.html',
  styleUrl: './poker-card.component.css',
})
export class PokerCardComponent {
  value = input.required<string>();
  selected = input(false);
  faceDown = input(false);
  size = input<'sm' | 'md' | 'lg'>('md');
  disabled = input(false);

  cardClick = output<string>();

  containerClasses = computed(() => {
    const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
      sm: 'w-12 h-[4.5rem]',
      md: 'w-16 h-24',
      lg: 'w-20 h-[7.5rem]',
    };

    const base = [
      'relative select-none rounded-lg border-2 flex flex-col items-center justify-center',
      'transition-all duration-200 ease-in-out',
      sizeClasses[this.size()],
    ];

    if (this.disabled()) {
      base.push('opacity-50 cursor-not-allowed');
    } else {
      base.push('cursor-pointer hover:-translate-y-1 hover:shadow-lg');
    }

    if (this.faceDown()) {
      base.push('bg-indigo-600 border-indigo-700');
    } else if (this.selected()) {
      base.push('bg-white border-indigo-600 border-[3px] scale-105 shadow-lg');
    } else {
      base.push('bg-white border-gray-300 text-black');
    }

    return base.join(' ');
  });

  cornerTextClasses = computed(() => {
    const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
      sm: 'text-[0.5rem] leading-none',
      md: 'text-xs leading-none',
      lg: 'text-sm leading-none',
    };
    const color = this.selected() && !this.faceDown() ? 'text-indigo-600 font-semibold' : 'text-gray-500';
    return `${sizeMap[this.size()]} ${color}`;
  });

  centerTextClasses = computed(() => {
    const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
      sm: 'text-base font-bold',
      md: 'text-xl font-bold',
      lg: 'text-2xl font-bold',
    };
    const color = this.selected() && !this.faceDown() ? 'text-indigo-600' : 'text-black';
    return `${sizeMap[this.size()]} ${color}`;
  });

  onClick(): void {
    if (!this.disabled()) {
      this.cardClick.emit(this.value());
    }
  }
}

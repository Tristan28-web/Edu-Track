"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { type MathTopic } from '@/config/topics';

interface MathKeyboardProps {
  onInsert: (text: string) => void;
  topic: string; // The slug of the topic
}

type Key = string | { display: string; value: string };

const commonKeys: Key[] = ['+', '−', '×', '÷', '(', ')', '^', '_'];

const topicKeys: Record<string, Key[]> = {
  'quadratic-equations-functions': ['x²', '√', '±', '=', '≤', '≥'],
  'rational-algebraic-expressions': [{ display: 'a/b', value: '()/()' }, '→', '≠', '∴'],
  'variation': ['∝', 'k', 'y=', 'x=', 'z='],
  'polynomial-functions': ['x³', 'x⁴', '...', 'Σ'],
  'exponential-logarithmic-functions': ['e', 'ln()', 'log()', '10^x', 'a^x'],
  'sequences-series': ['Σ', 'n', 'a₁', 'aₙ', 'd', 'r'],
  'probability': ['P(E)', 'n(S)', 'n(E)', '!', 'C', 'P'],
  'statistics': ['x̄', 'μ', 'σ', 'Σx', 'Σx²', 'n'],
};


export function MathKeyboard({ onInsert, topic }: MathKeyboardProps) {
  const specificKeys = topicKeys[topic] || [];

  const renderKey = (key: Key) => {
    const display = typeof key === 'object' ? key.display : key;
    const value = typeof key === 'object' ? key.value : key;

    return (
      <Button
        key={display}
        type="button"
        variant="outline"
        className="h-10 text-base font-mono"
        onClick={() => onInsert(value)}
      >
        {display}
      </Button>
    );
  };

  return (
    <div className="p-2 bg-muted/50 rounded-md border">
        <div className="grid grid-cols-8 gap-2">
            {commonKeys.map(renderKey)}
            {specificKeys.map(renderKey)}
        </div>
    </div>
  );
}

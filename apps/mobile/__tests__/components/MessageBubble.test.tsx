import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { MessageBubble } from '@/components/MessageBubble';
import { StyleSheet } from 'react-native';

const userMsg = { id: '1', role: 'user' as const, content: 'Hello Pierre!' };
const assistantMsg = { id: '2', role: 'assistant' as const, content: 'Hello! How are you?' };

describe('MessageBubble', () => {
  it('renders user message content', () => {
    render(<MessageBubble message={userMsg} />);
    expect(screen.getByText('Hello Pierre!')).toBeTruthy();
  });

  it('renders assistant message content', () => {
    render(<MessageBubble message={assistantMsg} />);
    expect(screen.getByText('Hello! How are you?')).toBeTruthy();
  });

  it('user message bubble has terracotta background', () => {
    render(<MessageBubble message={userMsg} />);
    const text = screen.getByText('Hello Pierre!');
    let currentNode = text;
    while (currentNode) {
      const styles = currentNode.props?.style;
      if (Array.isArray(styles)) {
        const hasBackgroundColor = styles.some(
          (style: any) => style?.backgroundColor === '#c4805a'
        );
        if (hasBackgroundColor) {
          expect(styles).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ backgroundColor: '#c4805a' }),
            ])
          );
          return;
        }
      }
      currentNode = currentNode.parent;
    }
    throw new Error('Could not find bubble with backgroundColor #c4805a');
  });

  it('assistant message bubble has dark background', () => {
    render(<MessageBubble message={assistantMsg} />);
    const text = screen.getByText('Hello! How are you?');
    let currentNode = text;
    while (currentNode) {
      const styles = currentNode.props?.style;
      if (Array.isArray(styles)) {
        const hasBackgroundColor = styles.some(
          (style: any) => style?.backgroundColor === '#252219'
        );
        if (hasBackgroundColor) {
          expect(styles).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ backgroundColor: '#252219' }),
            ])
          );
          return;
        }
      }
      currentNode = currentNode.parent;
    }
    throw new Error('Could not find bubble with backgroundColor #252219');
  });

  it('user message row is right-aligned', () => {
    render(<MessageBubble message={userMsg} />);
    const text = screen.getByText('Hello Pierre!');
    let currentNode = text;
    while (currentNode) {
      const styles = currentNode.props?.style;
      if (Array.isArray(styles)) {
        const hasJustifyContent = styles.some(
          (style: any) => style?.justifyContent === 'flex-end'
        );
        if (hasJustifyContent) {
          expect(styles).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ justifyContent: 'flex-end' }),
            ])
          );
          return;
        }
      }
      currentNode = currentNode.parent;
    }
    throw new Error('Could not find row with justifyContent flex-end');
  });

  it('assistant message row is left-aligned', () => {
    render(<MessageBubble message={assistantMsg} />);
    const text = screen.getByText('Hello! How are you?');
    let currentNode = text;
    while (currentNode) {
      const styles = currentNode.props?.style;
      if (Array.isArray(styles)) {
        const hasJustifyContent = styles.some(
          (style: any) => style?.justifyContent === 'flex-start'
        );
        if (hasJustifyContent) {
          expect(styles).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ justifyContent: 'flex-start' }),
            ])
          );
          return;
        }
      }
      currentNode = currentNode.parent;
    }
    throw new Error('Could not find row with justifyContent flex-start');
  });
});

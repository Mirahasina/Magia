import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './button';

describe('Button component', () => {
    it('renders children correctly', () => {
        render(<Button>Test Button</Button>);
        expect(screen.getByText('Test Button')).toBeInTheDocument();
    });
    
    it('applies basic semantic structure', () => {
        render(<Button>Submit</Button>);
        const btn = screen.getByRole('button', { name: 'Submit' });
        expect(btn).toBeInTheDocument();
    });
});

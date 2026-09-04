import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import GoogleLoginButton from './GoogleLoginButton';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';

describe('GoogleLoginButton', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('renders, reacts to hover and calls the click handler', async () => {
    const onClick = jest.fn();
    const { user } = renderWithProviders(<GoogleLoginButton onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Google' });

    fireEvent.mouseEnter(button);
    expect(button).toHaveStyle({ background: 'var(--bg-hover)' });

    fireEvent.mouseLeave(button);
    expect(button).toHaveStyle({ background: 'var(--bg-elevated)' });

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

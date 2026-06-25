import { useQuery } from '@tanstack/react-query';
import { useUserProfile } from '@/hooks/useUsers';
import { useAppStore } from '@/store';

/**
 * Standard fallback rates for popular currencies relative to 1 ILS.
 */
const FALLBACK_RATES: Record<string, number> = {
  ILS: 1.0,
  USD: 0.27,
  EUR: 0.25,
  GBP: 0.21,
};

/**
 * Custom query hook to fetch exchange rates with ILS as the base currency.
 * Uses a public, CORS-enabled API and caches the result.
 *
 * @param enabled Whether to enable the query execution.
 * @returns The React Query result containing the exchange rates record or undefined.
 */
export function useIlsExchangeRates(enabled: boolean) {
  return useQuery({
    queryKey: ['ils-exchange-rates'],
    queryFn: async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/ILS');
      if (!res.ok) {
        throw new Error('Failed to fetch ILS exchange rates');
      }
      const data = await res.json();
      if (
        data.result !== 'success' ||
        !data.rates ||
        typeof data.rates.USD !== 'number'
      ) {
        throw new Error('Invalid exchange rate response structure');
      }
      return data.rates as Record<string, number>;
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Custom hook providing a dynamic currency formatter function based on the logged-in user's currency preference.
 * Defaults to Israeli New Shekel (ILS/₪). Converts the base ILS transaction amount dynamically to any chosen currency.
 *
 * @returns A formatter function mapping a number value in ILS to its formatted currency string.
 */
export function useFormatMoney() {
  const session = useAppStore((s) => s.session);
  const { data: userProfile } = useUserProfile(session?.userId);
  const currency = userProfile?.defaultCurrency || 'ILS';

  // Only fetch exchange rates if the selected currency is not ILS
  const { data: rates } = useIlsExchangeRates(currency !== 'ILS');

  return (value: number) => {
    let convertedValue = value;
    if (currency !== 'ILS') {
      const rate = rates?.[currency] ?? FALLBACK_RATES[currency] ?? 1.0;
      convertedValue = value * rate;
    }

    return convertedValue.toLocaleString('he-IL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
}


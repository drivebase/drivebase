import { lazy } from 'react';
import { ProviderType } from '@prisma/client';

export type CustomProviderProps = {
  onClose: () => void;
};

export type CustomProvider = {
  [key in ProviderType]?: React.LazyExoticComponent<
    (props: CustomProviderProps) => JSX.Element
  >;
};

export const CustomProviders: CustomProvider = {
  [ProviderType.TELEGRAM]: lazy(() => import('./telegram.provider')),
};

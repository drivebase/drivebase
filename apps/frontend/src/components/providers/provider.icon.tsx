import { ProviderType } from '@prisma/client';
import { getProviderIcon } from '@drivebase/frontend/helpers/provider.icon';
import { cn } from '@drivebase/react/utils';

type ProviderIconProps = {
  provider: ProviderType;
  className?: string;
};

function ProviderIcon({ provider, className }: ProviderIconProps) {
  return (
    <img
      src={getProviderIcon(provider)}
      alt={provider}
      className={cn('w-6 h-6', className)}
    />
  );
}

export default ProviderIcon;

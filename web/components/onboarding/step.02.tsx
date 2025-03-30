import { useQuery } from '@apollo/client';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@drivebase/web/components/ui/button';
import { GET_AVAILABLE_PROVIDERS } from '@drivebase/web/gql/queries/providers';
import { getProviderIcon } from '@drivebase/web/helpers/provider.icon';

type StepTwoProps = {
  onNext: () => void;
  onSkip: () => void;
};

function StepTwo({ onNext, onSkip }: StepTwoProps) {
  const { t } = useTranslation(['common', 'onboarding']);
  const { data: providers } = useQuery(GET_AVAILABLE_PROVIDERS);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        {providers?.availableProviders.map((provider) => {
          const iconUrl = getProviderIcon(provider.type);

          return (
            <div
              key={provider.type}
              className="flex items-center gap-2 hover:opacity-50 rounded-md cursor-pointer"
            >
              <img
                src={iconUrl}
                alt={provider.displayName || ''}
                width={15}
                height={15}
                className="rounded"
              />
              <h4 className="text-sm">{provider.displayName}</h4>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {t('onboarding:connect_provider_to_workspace')}
      </p>

      <div className="flex items-center gap-2 justify-between">
        <Button variant="link" onClick={onSkip} className="pl-0 text-muted-foreground">
          {t('common:skip')}
        </Button>
        <Button variant="outline" onClick={onNext} disabled>
          {t('common:next')} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default StepTwo;

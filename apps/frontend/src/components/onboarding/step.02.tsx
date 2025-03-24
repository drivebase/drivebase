import { useGetAvailableProvidersQuery } from '@drivebase/react/redux/endpoints/providers';
import { Button } from '@drivebase/react/components/button';
import { ArrowRight } from 'lucide-react';
import { getProviderIcon } from '@drivebase/frontend/helpers/provider.icon';
import { useTranslation } from 'react-i18next';

type StepTwoProps = {
  onNext: () => void;
  onSkip: () => void;
};

function StepTwo({ onNext, onSkip }: StepTwoProps) {
  const { t } = useTranslation(['common', 'onboarding']);
  const { data: providers } = useGetAvailableProvidersQuery();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        {providers?.data.map((provider) => {
          const iconUrl = getProviderIcon(provider.type);

          return (
            <div
              key={provider.type}
              className="flex items-center gap-2 hover:opacity-50 rounded-md cursor-pointer"
            >
              <img
                src={iconUrl}
                alt={provider.label}
                width={15}
                height={15}
                className="rounded"
              />
              <h4 className="text-sm">{provider.label}</h4>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {t('onboarding:connect_provider_to_workspace')}
      </p>

      <div className="flex items-center gap-2 justify-between">
        <Button
          variant="link"
          onClick={onSkip}
          className="pl-0 text-muted-foreground"
        >
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

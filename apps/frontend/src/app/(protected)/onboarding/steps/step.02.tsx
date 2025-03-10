import { useGetAvailableProvidersQuery } from '@drivebase/react/lib/redux/endpoints/providers';
import { Button } from '@drivebase/react/components/button';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

type StepTwoProps = {
  onNext: () => void;
  onSkip: () => void;
};

function StepTwo({ onNext, onSkip }: StepTwoProps) {
  const { data: providers } = useGetAvailableProvidersQuery();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        {providers?.data.map((provider) => (
          <div
            key={provider.type}
            className="flex items-center gap-2 hover:opacity-50 rounded-md cursor-pointer"
          >
            <Image
              src={provider.logo}
              alt={provider.label}
              width={15}
              height={15}
              className="rounded"
            />
            <h4 className="text-sm">{provider.label}</h4>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Select a provider to connect to your workspace.
      </p>

      <div className="flex items-center gap-2 justify-between">
        <Button
          variant="link"
          onClick={onSkip}
          className="pl-0 text-muted-foreground"
        >
          Skip
        </Button>
        <Button variant="outline" onClick={onNext} disabled>
          Next <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default StepTwo;

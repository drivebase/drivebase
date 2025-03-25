import { Button } from '@drivebase/web/components/ui/button';

type StepThreeProps = {
  onNext: () => void;
};

function StepThree({ onNext }: StepThreeProps) {
  return (
    <div>
      <Button variant={'outline'} onClick={onNext}>
        Next
      </Button>
    </div>
  );
}

export default StepThree;

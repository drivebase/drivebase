import { motion } from 'framer-motion';
import { Button } from '@drivebase/ui/components/button';
import { Input } from '@drivebase/ui/components/input';
import { useRef, useState } from 'react';
import { useCreateWorkspaceMutation } from '@drivebase/ui/lib/redux/endpoints/workspaces';

type StepOneProps = {
  onNext: (workspaceId: string) => void;
};

function StepOne({ onNext }: StepOneProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation();
  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onNext('cded9b17-85b3-464f-a4fc-5b31c839543d');
    return;
    // const name = nameRef.current?.value;
    // if (name) {
    //   createWorkspace({ name })
    //     .unwrap()
    //     .then((workspace) => {
    //       if (workspace.data) {
    //         onNext(workspace.data.id);
    //       }
    //     });
    // }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-sm text-muted-foreground"
      >
        <Input placeholder="Enter your workspace name" ref={nameRef} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Button
          className="px-10"
          variant={'outline'}
          onClick={handleNext}
          isLoading={loading}
        >
          Create
        </Button>
      </motion.div>
    </div>
  );
}

export default StepOne;

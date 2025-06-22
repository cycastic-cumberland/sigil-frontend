import {Spinner} from "@/components/ui/shadcn-io/spinner";

const FullSizeSpinner = () => <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
    <div className={"w-full flex flex-row justify-center text-secondary"}>
        <Spinner size={50}/>
    </div>
</div>

export default FullSizeSpinner
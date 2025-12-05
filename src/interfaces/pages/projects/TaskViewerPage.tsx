import MainLayout from "@/interfaces/layouts/MainLayout.tsx";
import {useNavigate, useParams} from "react-router";
import FullSizeSpinner from "@/interfaces/components/FullSizeSpinner.tsx";
import {type FC, useEffect, useMemo, useRef, useState} from "react";
import TaskEditForm, {type EditTaskDto, patchTask} from "@/interfaces/components/TaskEditForm.tsx";
import {notifyApiError} from "@/utils/errors.ts";
import {formatQueryParameters} from "@/utils/format.ts";
import type {TaskDto} from "@/dto/pm/TaskDto.ts";
import {
    base64ToUint8Array,
    decryptWithPrivateKey,
    tryDecryptText,
} from "@/utils/cryptography.ts";
import {toast} from "sonner";
import {useTenant} from "@/contexts/TenantContext.tsx";
import {useConsent} from "@/contexts/ConsentContext.tsx";
import {isProjectPartition, type PartitionDto} from "@/dto/tenant/PartitionDto.ts";
import {createApi} from "@/api.ts";
import axios, {type AxiosInstance} from "axios";
import type {KanbanBoardDto} from "@/dto/pm/KanbanBoardDto.ts";
import {Label} from "@/components/ui/label.tsx";
import {useAuthorization} from "@/contexts/AuthorizationContext.tsx";

const tenantApi = createApi(null)

const TaskViewer : FC<{
    api: AxiosInstance,
    editTaskForm: EditTaskDto,
    partitionKey: CryptoKey,
    reloadTrigger: () => void,
}> = ({api, editTaskForm, reloadTrigger, partitionKey}) => {
    const [isLoading, setIsLoading] = useState(false)

    const onSave = async (task: EditTaskDto) => {
        try {
            setIsLoading(true)

            await patchTask({
                api,
                task,
                editTaskForm,
                partitionKey,
            })

            toast.success("Task saved successfully")
            reloadTrigger()
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    return <div className={'w-full flex flex-col px-4 py-2 gap-4'}>
        <p className={'text-2xl font-bold'}>{editTaskForm.taskId}</p>
        <div className={'w-full'}>
            <TaskEditForm isLoading={isLoading}
                          partitionKey={partitionKey}
                          api={api}
                          form={editTaskForm}
                          onSave={onSave}
                          showComments/>
        </div>
    </div>
}

const TaskViewerPage = () => {
    const [counter, setCounter] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [partitionKey, setPartitionKey] = useState(null as CryptoKey | null)
    const {tenantId} = useTenant()
    const {taskId} = useParams()
    const partitionRef = useRef(null as number | null)
    const [editTaskForm, setEditTaskForm] = useState(null as EditTaskDto | null)
    const {requireDecryption} = useConsent()
    const {userPrivateKey} = useAuthorization()
    const navigate = useNavigate()
    const api = useMemo(() => createApi(partitionRef), [])

    const tryGetKanbanBoard = async (api: AxiosInstance, id: unknown) => {
        if (!Number.isSafeInteger(id)){
            throw Error("Board ID is not a valid integer")
        }

        try {
            const kanbanResponse = await api.get(`pm/kanban/id/${id}`)
            return kanbanResponse.data as KanbanBoardDto
        } catch (e){
            if (axios.isAxiosError(e) && e.status === 404){
                return
            }

            throw e
        }
    }

    const reloadTask = async () => {
        if (!taskId){
            toast.error("No task ID supplied")
            navigate(`/tenant/${tenantId}/partitions/browser/`)
            return
        }

        try {
            setIsLoading(true)
            const userPrivateKey = await requireDecryption()

            const taskResponse = await tenantApi.get(formatQueryParameters('pm/tasks/task',{
                taskId
            }))
            const task = taskResponse.data as TaskDto
            partitionRef.current = task.projectPartitionId

            const partitionResponse = await tenantApi.get(formatQueryParameters('partitions/partition',{
                id: task.projectPartitionId
            }))
            const partition = partitionResponse.data as PartitionDto
            if (!isProjectPartition(partition)){
                toast.error("Partition is not a project")
                return
            }

            const key = await decryptWithPrivateKey(userPrivateKey, base64ToUint8Array(partition.userPartitionKey.cipher))
            const decryptedPartitionKey = await crypto.subtle.importKey(
                "raw",
                key,
                { name: "AES-GCM" },
                true,
                ["encrypt", "decrypt"]
            )
            setPartitionKey(decryptedPartitionKey)

            const name = await tryDecryptText(decryptedPartitionKey, task.encryptedName.cipher, base64ToUint8Array(task.encryptedName.iv!))
            const content = await tryDecryptText(decryptedPartitionKey,
                task.encryptedContent?.cipher,
                task.encryptedContent?.iv ? base64ToUint8Array(task.encryptedContent?.iv) : undefined)

            const board = await tryGetKanbanBoard(api, task.kanbanBoardId)

            setEditTaskForm({
                taskId,
                project: partition,
                kanbanBoard: board,
                name,
                content,
                taskStatus: task.taskStatus,
                taskPriority: task.priority,
                reporter: task.reporter,
                assignee: task.assignee,
            })
        } catch (e) {
            notifyApiError(e)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        reloadTask().then(undefined)
    }, [counter, userPrivateKey]);

    if (isLoading){
        return <MainLayout>
            {isLoading && <div className={'w-full flex flex-grow'}>
                <FullSizeSpinner/>
            </div>}
        </MainLayout>
    }

    return <MainLayout>
        {partitionKey
            ? (editTaskForm
                ? <TaskViewer api={api}
                              editTaskForm={editTaskForm}
                              partitionKey={partitionKey}
                              reloadTrigger={() => setCounter(c => c + 1)}/>
                : <div className={'w-full flex flex-col flex-grow'}>
                    <FullSizeSpinner/>
                </div>)
            : <div className={"flex flex-col flex-grow w-full justify-center gap-2"}>
                <div className={"w-full flex flex-row justify-center"}>
                    <Label className={"text-foreground font-bold text-4xl"}>
                        Task data locked
                    </Label>
                </div>
                <div className={"w-full flex flex-row justify-center"}>
                    <p className={"text-muted-foreground px-2 text-center"}>
                        Your data is locked. Tap the padlock above to unlock.
                    </p>
                </div>
            </div>}
    </MainLayout>
}

export default TaskViewerPage
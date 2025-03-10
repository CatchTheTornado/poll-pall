import { Agent, AgentFlow } from "@/data/client/models";
import { AgentDefinition, convertToFlowDefinition, EditorStep, FlowInputVariable } from "@/flows/models";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AgentApiClient } from "@/data/client/agent-api-client";
import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "@/contexts/db-context";
import { SaaSContext } from '@/contexts/saas-context';
import JsonView from "@uiw/react-json-view";
import { ChatMessageMarkdown } from "../chat-message-markdown";
import { PlayIcon } from "lucide-react";
import { getErrorMessage, safeJsonParse } from "@/lib/utils";
import DataLoader from "../data-loader";
import { Card, CardContent } from "../ui/card";
import { DataLoaderIcon } from "../data-loader-icon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { nanoid } from "nanoid";
import { useExecContext } from "@/contexts/exec-context";
import moment from "moment";
import { FlowInputValuesFiller } from "./flows-input-filler";
import { Axios, AxiosError } from "axios";
import { Chunk, DebugLog } from "./flows-debug-log";
import { set } from "date-fns";

export function FlowsExecForm({ agent, agentFlow, agents, inputs, flows } :
    { agent: Agent | undefined; agentFlow: AgentFlow | undefined; rootFlow: EditorStep | undefined, flows: AgentFlow[], agents: AgentDefinition[]; inputs: FlowInputVariable[] }) {

    const [sessionId, setSessionId] = useState<string>(nanoid());
    const [timeElapsed, setTimeElapsed] = useState<number>(0);
    let timeCounter = null;
    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const [flowResult, setFlowResult] = useState<any | null>(null);
    const dbContext = useContext(DatabaseContext);
    const saasContext = useContext(SaaSContext);
    const { t, i18n } = useTranslation();
    const [currentTabs, setCurrentTabs] = useState<string[]>([]);

    const [requestParams, setRequestParams] = useState<Record<string, any> | string>();
    const [generalError, setGeneralError] = useState<string | null>(null);
    
    const [executionInProgress, setExecutionInProgress] = useState<boolean>(false);
    const [currentFlow, setCurrentFlow] = useState<AgentFlow | undefined>(agentFlow);


    const [stackTraceChunks, setStackTraceChunks] = useState<Chunk[]>([]);


    const getSessionHeaders = () => {
        return {
            'Database-Id-Hash': execContext.databaseIdHash,
            'Agent-Id': execContext.agent?.id ?? '',
            'Agent-Locale': execContext.locale,
            'Agent-Session-Id': execContext.sessionId,
            'Current-Datetime-Iso': moment(new Date()).toISOString(true),
            'Current-Datetime': new Date().toLocaleString(),
            'Current-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    }
       
       
    const execContext = useExecContext();

    useEffect(() => {   
        execContext.init(agent?.id, dbContext?.databaseIdHash, i18n.language, nanoid() /** generate session id */).catch((e) => {
            console.error(e);
            setGeneralError(t(getErrorMessage(e)));
          }).then(() => {
            setIsInitializing(false);
          });
        }, [agent, dbContext?.databaseIdHash, i18n.language]);

  return (
    <Card>
        <CardContent className="p-4">
            {isInitializing ? (
                <div className="text-center">
                    <div className="flex justify-center m-4"><DataLoader /></div>
                    <div className="text-gray-500 text-center">{t("Initializing runtime environment...")}</div>
                </div>
            ) : (
                    generalError ? (
                        <div className="text-center">
                            <div className="flex justify-center m-4 text-red-400 text-2xl">{t('Error')}</div>
                            <div className="text-red-500 text-center">{generalError}</div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-2">
                                <FlowInputValuesFiller variables={agent?.inputs ?? []} onChange={(values) => {
                                    setRequestParams(values);
                                }} />
                            </div>
                            <div className="flex">
                                {executionInProgress ? 
                                        <DataLoaderIcon />
                                : null}
                                <Button disabled={executionInProgress} variant={"secondary"} size="sm" onClick={() => {
                                const flow = flows.find(f => f.code === agentFlow?.code);
                                

                                const requiredFields = agent?.inputs?.filter(input => input.required).map(input => input.name) ?? [];
                                if (requestParams && typeof requestParams === 'object') {
                                    const missingFields = requiredFields.filter(field => !requestParams[field]);

                                    if (missingFields.length > 0) {
                                        toast.error(t('Please fill in all required fields: ') + missingFields.join(', '));
                                        setFlowResult(t('Please fill in all required fields: ') + missingFields.join(', '));
                                        return;
                                    }
                                }

                                if (!requestParams && requiredFields.length > 0) {
                                    toast.error(t('Please fill in all required fields: ') + requiredFields.join(', '));
                                    setFlowResult(t('Please fill in all required fields: ') + requiredFields.join(', '));
                                    return;
                                }

                                if (flow) {
                                    const exec = async () => {
                                        setTimeElapsed(0);
                                        setStackTraceChunks([]);
                                        setExecutionInProgress(true);
                                        try {
                                            const apiClient = new AgentApiClient('', dbContext, saasContext);
                                            //setFlowResult(response);
                                            setCurrentTabs(['result', 'trace']);

                                            timeCounter = setInterval(() => {
                                                setTimeElapsed(prv => prv + 1);
                                            }, 1000);
                                            try {
                                                const stream =await apiClient.execStream(agent?.id, flow.code, requestParams, 'sync', getSessionHeaders());

                                                for await (const chunk of stream) {
                                                    console.log("Received chunk:", chunk);
                                                    setStackTraceChunks(prv => [...prv, chunk]);

                                                    if (chunk['type'] === 'finalResult') {
                                                        setFlowResult(chunk['result']);
                                                    }
                                                }
                                            } catch (e) {
                                                const respData = (e as AxiosError).response?.data ?? t('An error occurred');
                                                setFlowResult(safeJsonParse(respData as string, respData));
                                            }

                                            clearInterval(timeCounter);


                                        } catch (e) {
                                            toast.error(t('Failed to execute flow: ') + getErrorMessage(e));
                                            console.error(e);
                                        }
                                        setExecutionInProgress(false);
                                    }

                                    exec();


                                } else {
                                    toast.error(t('Flow is not defined'));
                                }

                            }}><PlayIcon className="w-4 h-4"/>{t('Execute')}</Button>
                            <div className="ml-2 text-xs h-8 items-center flex">{t('Session Id: ')} {execContext.sessionId}

                            { executionInProgress && (
                                    <div className="ml-2 text-xs flex ">{t(' - executing flow (' + timeElapsed + ' seconds)... ')}</div>
                                )}


                            </div>
                        </div>
                    </div>
                    )
                )
            }

        {flowResult || stackTraceChunks && stackTraceChunks.length > 0 ? (
            <Accordion type="multiple" value={currentTabs} onValueChange={(value) => setCurrentTabs(value)}  className="w-full mt-4">
                {flowResult && (
                    <AccordionItem value={"result"}>
                        <AccordionTrigger>{t('Result')}</AccordionTrigger>
                        <AccordionContent>
                            {(typeof flowResult === 'string') ? <ChatMessageMarkdown>{flowResult}</ChatMessageMarkdown> :
                                <JsonView value={flowResult} />}
                        </AccordionContent>
                    </AccordionItem>
                )}
                <AccordionItem value={"trace"}>
                    <AccordionTrigger>{t('Trace')}</AccordionTrigger>
                    <AccordionContent>
                        <DebugLog chunks={stackTraceChunks} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        ) : null}

        </CardContent>  

        

    </Card>
  );
}
'use client'
import { useAgentContext } from '@/contexts/agent-context';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DatabaseContext } from '@/contexts/db-context';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Result, Session } from '@/data/client/models';
import { RenderResult } from '@/components/render-result';
import { Tabs } from '@/components/ui/tabs';
import { TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { Chat } from '@/components/chat';


export default function SingleResultPage() {
  const agentContext = useAgentContext();
  const params = useParams();

  const dbContext = useContext(DatabaseContext);
  const { t, i18n  } = useTranslation();

  const [result, setResult] = useState<Result>();
  const [session, setSession] = useState<Session>();


  useEffect(() => {
    if (agentContext.current?.id)
      agentContext.singleResult(params.sessionId as string).catch((e) => {
        toast.error(getErrorMessage(e));
      }).then((result) => {
        if (result) setResult(result);
      });

      agentContext.singleSession(params.sessionId as string).catch((e) => {
        toast.error(getErrorMessage(e));
      }).then((session) => {
        if (session) { 
          setSession(session);
          console.log(session.messages)
        }
      });
  }, [agentContext.current]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {new Date(result?.createdAt ?? Date.now()).toLocaleString()} {result?.userName} {result?.userEmail ? `- ${result.userEmail}` : ''}
          </CardTitle>  
        </CardHeader>
        <CardContent>
        <Tabs defaultValue="content">
          <TabsList className="grid grid-cols-2">
              <TabsTrigger value="content" className="dark:data-[state=active]:bg-zinc-900 data-[state=active]:bg-zinc-100 data-[state=active]:text-gray-200 p-2 rounded-md text-sm">{t('Result')}</TabsTrigger>
              <TabsTrigger value="chat" className="dark:data-[state=active]:bg-zinc-900 data-[state=active]:bg-zinc-100 data-[state=active]:text-gray-200 p-2 rounded-md text-sm">{t('Message history')}</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="p-2 text-sm">
            <RenderResult result={result} />
            </TabsContent>      
          <TabsContent value="chat">
            <Chat 
                  messages={session?.messages ?? []}
                  isReadonly={true}
              />
            </TabsContent>
          </Tabs>                  
        </CardContent>
      </Card>

    </div>
  );
}
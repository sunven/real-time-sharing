'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useLocalStorageState } from 'ahooks'

type Message = {
  type: 'text' | 'image'
  content: string
}

const channelName = '__rts_messages'

export default function RealTimeSharing() {
  const [inputText, setInputText] = useState('')
  const [supabase, setSupabase] = useState<SupabaseClient>()
  const [messages, setMessages] = useLocalStorageState<Message[]>('__rts_messages', { defaultValue: [] })

  const send = useCallback((message: Message) => {
    const channel = supabase?.channel(channelName)
    return new Promise((resolve, reject) => {
      channel?.subscribe((status, err) => {
        // Wait for successful connection
        if (status !== 'SUBSCRIBED') {
          console.error(status, err)
          reject(false)
          return
        }

        // Send a message once the client is subscribed
        channel
          .send({
            type: 'broadcast',
            event: 'test',
            payload: message,
          })
          .then(() => {
            setMessages(prevState => {
              return [message, ...(prevState?.splice(0, 20) ?? [])]
            })
            resolve(true)
          })
          .catch(e => {
            console.error(e)
            reject(false)
          })
      })
    })
  }, [])

  const sendMessage = () => {
    if (!inputText) {
      return
    }
    send({ type: 'text', content: inputText }).then(() => {
      setInputText('')
    })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        const message: Message = { type: 'image', content: e.target?.result as string }
        send(message)
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)
    setSupabase(supabase)
    const channel = supabase.channel(channelName)

    // Subscribe to the Channel
    channel
      .on('broadcast', { event: 'test' }, ({ payload }) => {
        console.log('payload', payload)
        setMessages(prevState => {
          return [payload as Message, ...(prevState?.splice(0, 20) ?? [])]
        })
      })
      .subscribe()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">实时共享</h1>
      <div className="mb-4">
        <Input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="输入消息..."
          className="mb-2"
        />
        <div className="flex gap-2">
          <Button onClick={sendMessage}>发送消息</Button>
          <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
          <Button asChild>
            <label htmlFor="image-upload">上传图片</label>
          </Button>
          <Button
            onClick={() => {
              setMessages([])
            }}
            variant="outline"
          >
            清除历史
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {messages?.map((message, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              {message.type === 'text' ? (
                <p>{message.content}</p>
              ) : (
                <img src={message.content} alt="Shared" className="max-w-full h-auto" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

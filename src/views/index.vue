<script setup>
import 'vue-element-plus-x/styles/prism.min.css' // Prism 核心基础样式
import '@/assets/styles/prism-one-light.css'
import { ElementPlus, Paperclip, Promotion, Money, Plus } from '@element-plus/icons-vue'
import { Conversations, BubbleList, Thinking, Sender } from 'vue-element-plus-x'
import dayjs from 'dayjs'
import UseDexie from '@/hooks/useDexie'
import { getBalanceApi, useOpneai } from '@/api/deepSeek'

const dexie = new UseDexie()

const aiModels = [
  {
    name: 'deepseek-chat',
    title: 'Deep Seek Chat',
    description: 'Deep Seek Chat Model',
    isReasoner: false,
  },
]
const currentAiModel = ref({})
const messages = ref([])
const messageStyle = {
  avatar: 'https://example.com/ai-avatar.png',
  avatarSize: '36px', // 头像占位大小
  avatarGap: '12px', // 头像与气泡之间的距离
  maxWidth: 'none', // 气泡最大宽度 none | 100% | 200px | 300px | 400px | 500px
  shape: 'round', // 气泡的形状
  variant: 'filled', // 气泡的样式
}
const handelChangeAiModel = (model) => {
  currentAiModel.value = model
  dexie.createTable(model.name)
  dexie.setCurrentModel(model.name)
  messages.value = []
}
handelChangeAiModel(aiModels[0])

const conversations = ref([])
const getConversations = async () => {
  const res = await dexie.getConversations()
  conversations.value = res.map(item => ({
    ...item,
    label: item.title,
    group: getDateStatus(item.createdAt),
  }))
  // if (res.length) {
  //   currentConversationId.value = res[0].id
  //   messages.value = await dexie.getMessages(res[0].id)
  // }
}
getConversations()

const bubbleListRef = ref()
const currentConversationId = ref('')
const selectConversation = async (item) => {
  currentConversationId.value = item.id
  messages.value = []
  const res = await dexie.getMessages(item.id)
  messages.value = res.map(item => ({
    ...item,
    key: item.id,
    typing: false,
    ...messageStyle,
  }))
  senderValue.value = ''
  senderRef.value.clear()
  bubbleListRef.value.scrollToTop()
}
const deleteConversation = async (item) => {
  if (currentConversationId.value === item.id) {
    currentConversationId.value = ''
    messages.value = []
  }
  await dexie.deleteConversation(item.id)
  await dexie.deleteMessages(item.id)
  getConversations()
}

const handleMenuCommand = async (command, item) => {
  if (command === 'delete') {
    await deleteConversation(item)
  } else if (command === 'rename') {
    const newTitle = prompt('请输入新的标题', item.title)
    if (newTitle) {
      await dexie.updateConversation(item.id, { title: newTitle })
      getConversations()
    }
  }
}

const senderValue = ref('')
const senderRef = ref()
const senderLoading = ref(false)
const newConversation = () => {
  currentConversationId.value = ''
  messages.value = []
  senderValue.value = ''
  senderRef.value.clear()
}

const thinkingStatus = ref('')
async function handleSubmit(inputValue) {
  if (inputValue.trim()) {

    if (!currentConversationId.value) {
      const conversationId = await dexie.addConversation(inputValue)
      const newConversation = await dexie.getConversation(conversationId)
      currentConversationId.value = newConversation.id
      conversations.value.unshift({
        ...newConversation,
        label: newConversation.title,
        group: getDateStatus(newConversation.createdAt),
      })
    }

    senderLoading.value = true
    senderValue.value = ''
    await messageHandler(inputValue, true)
    await messageHandler({
      reasoning_content: currentAiModel.value.isReasoner ? '' : null,
      content: '',
      isMarkdown: true,
      loading: true
    })
    thinkingStatus.value = 'start'
    const stream = await useOpneai(
      messages.value.filter(item => item.content).map(item => ({
        role: item.role,
        content: item.content,
      })),
      currentAiModel.value.isReasoner ? 'deepseek-reasoner' : 'deepseek-chat'
    )

    if (stream) {
      for await (const chunk of stream) {
        if (chunk === '[DONE]') {
          senderLoading.value = false
        }

        const reasoning_content = chunk.choices[0]?.delta?.reasoning_content
        if (reasoning_content !== null && reasoning_content) {
          thinkingStatus.value = 'thinking'
        } else {
          thinkingStatus.value = 'end'
        }
        const content = chunk.choices[0]?.delta?.content
        await messageHandler({ key: messages.value[messages.value.length - 1].key, reasoning_content, content })
      }
      // senderLoading.value = false
    } else {
      messages.value.push('Error: Unable to get a response.')
    }
  }
}

async function messageHandler(message, isUser = false) {
  if (message) {
    if (message.key) {
      const index = messages.value.findIndex((item) => item.key === message.key)
      messages.value[index].loading = false
      messages.value[index].thinkingStatus = message.reasoning_content != null ? 'thinking' : 'end'
      if (message.reasoning_content != null) messages.value[index].reasoning_content += message.reasoning_content
      if (message.content) messages.value[index].content += message.content
      dexie.updateMessage(message.key, messages.value[index])
    } else {
      const messageObj = {
        role: isUser ? 'user' : 'assistant', // user | ai 自行更据模型定义
        placement: isUser ? 'end' : 'start', // start | end 气泡位置
        reasoning_content: message.reasoning_content, // 思考内容
        thinkingStatus: message.reasoning_content != null ? 'start' : null, // 思考状态
        content: message.content ?? message, // 消息内容 流式接受的时候，只需要改这个值即可
        loading: message.loading || false, // 当前气泡的加载状态
        isMarkdown: !isUser, // 是否渲染为 markdown
        typing: !isUser, // 是否开启打字器效果 该属性不会和流式接受冲突
        noStyle: !isUser,
        ...messageStyle,
      }
      const key = await dexie.addMessage(currentConversationId.value, messageObj)
      messages.value.push({
        key, // 唯一标识
        ...messageObj
      })
    }
  }
}

// 查询余额
async function getBalance() {
  const res = await getBalanceApi()
  if (res) {
    const balance_infos = res?.balance_infos[0]
    const currency = balance_infos?.currency
    ElNotification({
      title: '余额',
      dangerouslyUseHTMLString: true,
      message: `
        <div>总可用余额：${balance_infos?.total_balance} ${currency}</div>
        <div>未过期的赠金余额：${balance_infos?.granted_balance} ${currency}</div>
        <div>充值余额：${balance_infos?.topped_up_balance} ${currency}</div>
      `,
    })
  } else {
    ElMessage.error(`查询失败`)
  }
}

// 判断日期是今天、昨天或其他日期
function getDateStatus(date) {
  const inputDate = dayjs(date);
  const today = dayjs();
  const yesterday = today.subtract(1, 'day');
  
  if (inputDate.isSame(today, 'day')) {
    return '今天';
  } else if (inputDate.isSame(yesterday, 'day')) {
    return '昨天';
  } else {
    return inputDate.format('YYYY-MM-DD'); // 其他日期返回格式化字符串
  }
}
</script>
<template>
  <el-container>
    <el-aside width="319px">
      <div class="aside-header">{{ currentAiModel.title }}</div>
      <el-button class="add-conversation" type="primary" :icon="Plus" @click="newConversation">新对话</el-button>
      <Conversations
        v-model:active="currentConversationId"
        :items="conversations"
        groupable
        row-key="id"
        showBuiltInMenu
        @change="selectConversation"
        @menu-command="handleMenuCommand"
      />
    </el-aside>

    <el-container>
      <el-header>
        <el-button
          v-if="currentAiModel.name === 'deepseek-chat'"
          type="primary"
          :icon="Money"
          @click="getBalance">
          查询余额
        </el-button>
      </el-header>

      <el-main>
        <BubbleList ref="bubbleListRef" :list="messages">
          <template #header="{ item }">
            <Thinking
              v-if="item.thinkingStatus && !item.loading"
              :status="item.thinkingStatus"
              :content="item.reasoning_content"
              button-width="250px"
              max-width="100%"
            />
          </template>
        </BubbleList>
        <Sender
          ref="senderRef"
          v-model="senderValue"
          variant="updown"
          submit-type="enter"
          clearable
          @submit="handleSubmit">
          <template #prefix>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <div
                :class="{ isSelect: currentAiModel.isReasoner }"
                style="display: flex; align-items: center; gap: 4px; padding: 2px 12px; border: 1px solid silver; border-radius: 15px; cursor: pointer; font-size: 12px;"
                @click="currentAiModel.isReasoner = !currentAiModel.isReasoner">
                <el-icon><ElementPlus /></el-icon>
                <span>深度思考</span>
              </div>
            </div>
          </template>

          <template #action-list>
            <div style="display: flex; align-items: center; gap: 8px;">
              <el-button round plain color="#626aef">
                <el-icon><Paperclip /></el-icon>
              </el-button>

              <el-button :loading="senderLoading" round color="#626aef">
                <el-icon v-show="!senderLoading" @click="senderLoading = true"><Promotion /></el-icon>
                <template #loading>
                  <div class="custom-loading" @click="senderLoading = false">
                    <svg class="circular" viewBox="-10, -10, 50, 50">
                      <path
                        class="path"
                        d="
                          M 30 15
                          L 28 17
                          M 25.61 25.61
                          A 15 15, 0, 0, 1, 15 30
                          A 15 15, 0, 1, 1, 27.99 7.5
                          L 15 15
                        "
                        style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"
                      />
                    </svg>
                  </div>
                </template>
              </el-button>
            </div>
          </template>
        </Sender>
      </el-main>
    </el-container>
  </el-container>
</template>
<style lang='scss' scoped>
.el-container {
  height: 100%;
}
.el-aside {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background-color: #f5f5f5;

  .aside-header {
    font-size: 24px;
    font-weight: bold;
    color: #333;
    text-align: center;
  }

  .add-conversation {
    margin: 12px auto;
  }

  .conversations-container {
    flex: 1;
    height: 0;
  }
}

.el-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  box-shadow: 4px 0px 4px rgba(0, 0, 0, 0.1);
}

.el-main {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  padding: 20px;

  ::v-deep(.el-bubble-list) {
    flex: 1;
    max-height: none;
    margin-bottom: 16px;

    .markdown-body {
      table {
        border: 1px solid #ccc;
        border-collapse: collapse;

        tr {
          th,
          td {
            border-bottom: 1px solid #ccc;
            border-right: 1px solid #ccc;
            padding: 5px 10px;

            &:last-child {
              border-right: none;
            }
          }

          th {
            text-align: center;
            background: #dee8ee;
          }

          &:last-child td {
            border-bottom: none;
          }
        }
      }
    }

    pre {
      padding: 10px 14px;
      background: hsl(230, 1%, 98%);
      border-radius: 12px;
    }
  }

  .isSelect {
    color: #626aef;
    border: 1px solid #626aef !important;
    border-radius: 15px;
    padding: 3px 12px;
    font-weight: 700;
  }
}

.custom-loading {
  
  &::before {
    position: none;
    pointer-events: auto;
  }

  .circular {
    width: 14px;
    height: 14px;
    animation: loading-rotate 2s linear infinite;

    .path {
      animation: loading-dash 1.5s ease-in-out infinite;
      stroke-dasharray: 90, 150;
      stroke-dashoffset: 0;
      stroke-width: 2;
      stroke: white;
      stroke-linecap: round;
    }
  }
}
@keyframes loading-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes loading-dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -40;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -120;
  }
}
</style>

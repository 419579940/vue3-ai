import axios from 'axios'
import qs from 'qs'

const service = axios.create({
  baseURL: (import.meta.env.DEV ? import.meta.env.VITE_API_URL : '') + 'api/', // api的base_url
  withCredentials: false, // 是否携带cookie
  timeout: 60000 // 超时响应
})

// 字节流下载flag
let isBlob = false

// axios拦截器 - 请求头拦截
service.interceptors.request.use(
  config => {
    // 根据请求头判断是否为字节流
    isBlob = config.responseType === 'blob'

    // 处理头部信息：添加token
    if (!config?.headers?.Authorization) config.headers.Authorization = sessionStorage.getItem('token') ?? ''

    // 请求为表单时
    if (config.contentType === 'form') {
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    // get请求包含数组时,参数进行qs序列化
    if (config.method === 'get') {
      config.paramsSerializer = params => {
        return qs.stringify(params, { arrayFormat: 'repeat' })
      }
    }

    // 请求参数为空时默认给个空对象，undefined和null有一些后端会说报错。
    config.data = config.data || {}
    config.params = config.params || {}
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// axios拦截器 - 响应拦截
service.interceptors.response.use(
  response => {
    // 如果为字节流，直接抛出字节流，不走code验证
    if (isBlob) {
      return response
    }

    const res = response.data

    // 后台返回非200处理
    // if (res.code !== 200) {
    //   ElMessage({
    //     message: res.message || 'Error',
    //     type: 'error',
    //     duration: 5 * 1000
    //   })

    //   // 401: token无效，重新登录
    //   if (res.code === 401) {
    //     ElMessageBox.confirm('登录失效，请重新登录', '提示', {
    //       confirmButtonText: '重新登录',
    //       cancelButtonText: '取消',
    //       type: 'warning'
    //     }).then(() => {
    //       const router = useRouter()
    //       router.push('/login') // token的问题都这里处理，并跳转到登录页
    //     })
    //   }
    //   return Promise.reject(new Error(res.message || 'Error'))
    // } else {
    // }
    return res
  },
  error => {
    // 异常抛出错误并弹个消息
    // ElMessage({
    //   message: error,
    //   type: 'error',
    //   duration: 5 * 1000
    // })
    handleNetworkError(error.response.status)
    return Promise.reject(error.response)
  }
)

const handleNetworkError = (errStatus) => {
  let errMessage = '未知错误'
  if (errStatus) {
    switch (errStatus) {
      case 400:
        errMessage = '错误的请求'
        break
      case 401:
        errMessage = '未授权，请重新登录'
        break
      case 403:
        errMessage = '拒绝访问'
        break
      case 404:
        errMessage = '请求错误,未找到该资源'
        break
      case 405:
        errMessage = '请求方法未允许'
        break
      case 408:
        errMessage = '请求超时'
        break
      case 500:
        errMessage = '服务器端出错'
        break
      case 501:
        errMessage = '网络未实现'
        break
      case 502:
        errMessage = '网络错误'
        break
      case 503:
        errMessage = '服务不可用'
        break
      case 504:
        errMessage = '网络超时'
        break
      case 505:
        errMessage = 'http版本不支持该请求'
        break
      default:
        errMessage = `其他连接错误 --${errStatus}`
      }
    } else {
      errMessage = `无法连接到服务器！`
    }
    ElMessage.error(errMessage)
  }

export default service

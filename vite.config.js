import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 根据当前工作模式加载不同的环境变量
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      AutoImport({ // 自动引入，不需要手动去写import
        // 这里可以不需要写import调用大部分vue/vue-router/pinia方法（记住是大部分）
        imports: [
          'vue',
          'vue-router',
          'pinia',
          'vue-i18n',
          // 详细配置
          {
            '@vueuse/core': [
              // named imports
              'useMouse', // import { useMouse } from '@vueuse/core',
              // alias
              ['useFetch', 'useMyFetch'] // import { useFetch as useMyFetch } from '@vueuse/core',
            ],
            axios: [
              // default imports
              ['default', 'axios'] // import { default as axios } from 'axios',
            ],
            /* '[package-name]': [
              '[import-names]',
              // alias
              ['[from]', '[alias]'],
            ], */
          },
          // example type import
          {
            from: 'vue-router',
            imports: ['RouteLocationRaw'],
            type: true,
          },
        ],
        // defaultExportByFilename: true, // 当设置为true时，插件将检查文件名是否以大写字母开头，如果是，则导入默认导出，否则导入命名导出
        ignore: [ 'h' ],
        /* ignore: [
          'useMouse',
          'useFetch'
        ], // 忽略的函数 */
        // include: [/\.[tj]sx?$/, /\.vue$/], // 匹配的文件，也就是哪些后缀的文件需要自动引入
        // dts: true, // 会在根目录生成auto-imports.d.ts，里面可以看到自动导入的api
        /* ignoreDts: [
          'ignoredFunction',
          /^ignore_/
        ], */ // 忽略dts文件，值可以是true、false、正则表达式、字符串、数组
        dirs: [
          'src/hooks',
          // './hooks/**', // 可以是目录的相对路径或绝对路径
        ], // 指定要导入的文件目录
        // vueTemplate: true, // 是否支持在Vue模板中自动导入
        // element需要通过resolvers引用
        resolvers: [
          ElementPlusResolver({
              exclude: /ElButtonGroup/ // 忽略自动导入 ElButtonGroup
          }),
          IconsResolver({ prefix: 'Icon' })
        ], // 第三方ui
        // 会自动生成eslint规则，防止eslint报错，默认是不开启的
        eslintrc: {
          enabled: true,
          // 下面两个是其他配置，默认即可
          // 输出一份json文件，默认输出路径为./.eslintrc-auto-import.json
          // filepath: './.eslintrc-auto-import.json', // @default './.eslintrc-auto-import.json'
          // globalsPropValue: true, // @default true 可设置 boolean | 'readonly' | 'readable' | 'writable' | 'writeable'
        },
      }),
      Components({ // 按需引入，避免没使用的组件也打包
        // deep: true, // 搜索子目录
        // globs: ['src/components/**/*.vue'], // 指定要搜索的文件目录
        // globalNamespaces: ['el'], // 全局命名空间，默认为['vue', 'vue-router']
        // dirs: ['src/components'], // 按需加载的文件夹，默认为src/components
        // extensions:['vue'], // 组件的扩展名，默认为['.vue']
        // directives: true, // 是否支持v-bind指令，default: `true` for Vue 3, `false` for Vue 2
        // dts: "src/components.d.ts", // 生成组件类型声明文件
        // collapseSamePrefixes: true, // 是否折叠相同前缀的路径
        // directoryAsNamespace: true, // 是否将目录名作为组件名的前缀
        resolvers: [
          // 配置elementPlus采用sass样式配色系统
          ElementPlusResolver({ importStyle: 'sass' }),
          IconsResolver({
            // prefix: 'Icon', // 自动引入的图标组件前缀
            enabledCollections: ['ep']
          }),
        ],
        // importPathTransform: (name) => name, // 自定义导入路径
        // allowOverrides: true, // 是否允许覆盖
        // include: [/\.vue$/, /\.vue\?vue/, /\.md$/], // 匹配的文件，也就是哪些后缀的文件需要自动引入
        // exclude: [/node_modules/, /\.git/, /\.nuxt/, /\/types\//], // 排除的文件
        // excludeNames: [/^Async.+/, 'vue', 'vue-router', 'pinia', 'pinia-plugin-persistedstate', 'element-plus', 'element-plus/es'] // 排除的命名空间
      }),
      Icons({
        // 自动安装图标库
        autoInstall: true
      }),
    ],
    resolve: {
      alias: [
        {
          find: '@',
          replacement: resolve(__dirname, 'src')
        }
      ]
    },
    css: {
      preprocessorOptions: {
        javascriptEnabled: true, // 允许在scss中使用js变量
        scss: {
          // additionalData: `
          //   @use "@/styles/element/index.scss" as *;
          // ` // 全局引入样式
        }
      }
    },
    server: {
      host: '0.0.0.0', // 服务监听地址，设置该值表示监听所有
      cors: true, // 允许跨源
      port: 9527, // 本地服务端口号
      proxy: { // 代理
        '^/proxyApi': { // api地址匹配的字符串，可以使用正则，此处表示以/api为开头的接口地址
          target: env.VITE_API_BASEURL, // 指向，表示上述需要匹配的地址都指向这个域名，注意要用/结尾
          rewrite: (path) => path.replace(/^\/proxyApi/, ''), // 如果匹配字符不需要了，可以使用重写去掉
          changeOrigin: true // 是否修改请求头的origin，让服务器认为这个请求来自本域名
        }
      }
    }
  }
})

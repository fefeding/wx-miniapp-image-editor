import jmGraph from "jmgraph";
import { base64ToFile } from "../../utils/fs";
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        height: {
            type: Number,
            value: 100
        },
        width: {
            type: Number,
            value: 100
        },
        renderer: {
            type: String,
            value: 'canvas'
        }
    },

    /**
     * 组件的初始数据
     */
    data: {
        graph: null as any,
        jmgraphPromise: null as any,
        imageData: '',
        status: 'init',
    },

    lifetimes: {
      created() {

      },
      ready() {
        this.data.status = 'ready';
      },
      detached() {
        console.log('graph destroy')
        this.data.graph && this.data.graph.destroy();
      },      
    },
    /**
     * 组件的方法列表
     */
    methods: {
        initGraph: async function(option={
          autoRefresh: true
        }) {
            if(this.data.graph) return this.data.graph;
            if(this.data.jmgraphPromise) return this.data.jmgraphPromise;
            return this.data.jmgraphPromise = new Promise(async (resolve) => {                
                wx.nextTick(async ()=>{
                  if(this.data.status !== 'ready') {
                    setTimeout(async ()=>{
                      const graph = await this.initGraph(option);
                      resolve(graph);
                    }, 200);
                  }
                  else {
                    const graph = await this.createGraphInstance(option);
                    resolve(graph)
                  }
                });                
            });            
          },
          // 获取渲染canvas
          async getRenderCanvas(): Promise<any> {
            
            return new Promise((resolve)=>{
              const query = this.createSelectorQuery().in(this);
              query.select('#jmgraph_canvas')
              .fields({ node: true, size: true })
              .exec(async (res) => {    
                  if(!res[0]) {
                    setTimeout(async ()=>{
                      const canvas = await this.getRenderCanvas();
                      resolve(canvas);
                    });
                    return;
                  }    
                  if(this.data.renderer === 'image') {
                    const canvas = wx.createOffscreenCanvas({
                      type: '2d',
                      width: res[0].width,
                      height: res[0].height
                    });
                    resolve(canvas);
                  }   
                  else {     
                    const canvas = res[0].node;
                    canvas.width = res[0].width;
                    canvas.height = res[0].height;

                    resolve(canvas);
                  }
                });
            });            
          },
          async createGraphInstance(option: any) {
            if(this.data.graph) return this.data.graph;
            const canvas = await this.getRenderCanvas();            
            option = {
                style: {
                    fill: '#000'
                },
                mode: '2d',
                width: canvas.width,
                height: canvas.height,
                autoRefresh: true,
                ...option
            };
            const graph = this.data.graph || (this.data.graph = new jmGraph(canvas, option));  
            if(this.data.renderer === 'image') {
              // 图片要极时更新
              graph.on('endDraw', ()=>{
                this.graphToImageFile(graph);
              });
            }
            return graph;
          },
          // 转为图片
          async graphToImageFile(graph?: any) {
            graph = graph || this.data.graph;
            if(!graph.needUpdate) return;
            return new Promise(resolve => {
              if(graph.refresh_image_timeout) clearTimeout(graph.refresh_image_timeout);              
              graph.refresh_image_timeout = setTimeout(async ()=>{
                const data = graph.toDataURL(); 
                  const tmpFilePath = await base64ToFile(data, `graph_${graph.id}_image.png`);// 转为临时文件   
                  console.log('graph image', tmpFilePath);  
                  this.setData({
                    imageData: tmpFilePath
                  });
                  resolve(tmpFilePath);
              }, 500);
            });
            
          },
          canvastouchstart(...args: any[]) {            
            //console.log('touchstart', args);
            return this.data.graph?.eventHandler?.touchStart(...args);
          },
          canvastouchmove(...args: any[]) {         
            //console.log('canvastouchmove', args);
            return this.data.graph?.eventHandler.touchMove(...args);
          },
          canvastouchend(...args: any[]) {
            return this.data.graph?.eventHandler.touchEnd(...args);
          },
          canvastouchcancel(...args: any[]) {
            return this.data.graph?.eventHandler.touchCancel(...args);
          },
          canvastap(...args: any[]) {
            //console.log('canvas tap', args);            
            return this.data.graph?.eventHandler?.tap?.(...args);
          }
    }
})

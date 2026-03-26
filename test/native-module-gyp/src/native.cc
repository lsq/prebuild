#include <node.h>

#if NODE_MAJOR_VERSION >= 10
#define TO_LOCAL(val) (val).ToLocalChecked()
#else
#define TO_LOCAL(val) (val)
#endif

namespace demo {

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;

void Method(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  args.GetReturnValue().Set(TO_LOCAL(String::NewFromUtf8(isolate, "world")));
}

void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "hello", Method);
}

NODE_MODULE(native, init)

}  // namespace demo

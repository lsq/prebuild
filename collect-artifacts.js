var fs = require('fs')
var path = require('path')
var abi = require('node-abi')
var eachSeries = require('each-series-async')
var error = require('./error')
var nodeExp = /.*\.node$/i

module.exports = collectArtifacts

function collectArtifacts (release, opts, cb) {
  var fileExp = opts['include-regex']
  var newPaths = []
  fs.readdir(release, function (err, files) {
    if (err) return cb(err)

    var collected = files.filter(function filterByRegex (filename) {
      return fileExp.test(filename)
    }).map(function addPath (filename) {
      return path.join(release, filename)
    })

    if (!collected.length) {
      return cb(error.noBuild(release))
    }

    var extractPath = path.join('prebuilds', [
    opts.platform,
    opts.arch,
    opts.libc
    ].join('-'))

    // 确保目标根目录存在
    fs.mkdir(extractPath, { recursive: true }, function (err) {
      if (err) return cb(err)
      // 使用 async.eachSeries 串行处理，避免并发过高导致文件系统错误
      eachSeries(collected, function (srcFile, next) {
        // 1. 计算相对路径 (例如: build/Release/a/b/c.txt -> a/b/c.txt)
        // 注意：这里假设 collected 中的文件都在 release 目录下
        var relativePath = path.relative(release, srcFile)
        // 2. 拼接目标路径 (例如: prebuilds/.../a/b/c.txt)
        if (nodeExp.test(relativePath)) {
          relativePath = prebuildName(opts)
        }
        var destFile = path.join(extractPath, relativePath)
        // 3. 确保目标文件的父目录存在 (例如 a/b/ 目录)
        var destDir = path.dirname(destFile)
        fs.mkdir(destDir, { recursive: true }, function (err) {
          if (err) return next(err)

          // 4. 复制文件
          fs.copyFile(srcFile, destFile, next)
          newPaths.push(destFile)
        })
      }, function (err) {
        if (err) return cb(err)
        // 5. 复制完成后，生成新的路径列表返回
        // 将 collected 中的源路径映射为新的目标路径
        // var newPaths = collected.map(function (srcFile) {
          // var relativePath = path.relative(release, srcFile)
          // return path.join(extractPath, relativePath)
        // })

        cb(null, newPaths)
      })
    })
  })
}

function encodeName (name) {
  return name.replace(/\//g, '+')
}

function prebuildName (opts) {
  var tags = [encodeName(opts.pkg.name || opts.runtime)]

  if (opts.runtime !== 'napi') {
    tags.push('abi' + abi.getAbi(opts.target, opts.runtime))
  }

  if (opts.tagUv) {
    var uv = opts.tagUv === true ? opts.uv : opts.tagUv
    if (uv) tags.push('uv' + uv)
  }

  if (opts.tagArmv) {
    var armv = opts.tagArmv === true ? opts.armv : opts.tagArmv
    if (armv) tags.push('armv' + armv)
  }

  if (opts.tagLibc) {
    var libc = opts.tagLibc === true ? opts.libc : opts.tagLibc
    if (libc) tags.push(libc)
  }

  return tags.join('.') + '.node'
}

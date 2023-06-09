import path from 'node:path';
import { RspackCLI } from '@rspack/cli';
import { DevTool, Mode, rspack, RspackOptions } from '@rspack/core';
import { from, Observable } from 'rxjs';
import { NamedChunksPlugin } from '../../webpack/plugins/named-chunks-plugin';
import { OccurrencesPlugin } from '../../webpack/plugins/occurrences-plugin';
import { AngularWebpackPlugin } from '@ngtools/webpack';
import webpack from 'webpack';
import { Target } from '@rspack/core/dist/config/types';
import { ProgressPlugin } from './plugins/progress-plugin';

export function webpackFactory(options: any) {
  return from(createWebpackFactoryFromRspackCLI(options)) as unknown as Observable<typeof webpack>;
}

async function createWebpackFactoryFromRspackCLI(options: any) {
  const rspackCommand = 'build';
  process.env.RSPACK_CONFIG_VALIDATE = 'loose';
  let nodeEnv = process?.env?.NODE_ENV;
  let rspackCommandDefaultEnv = rspackCommand === 'build' ? 'production' : 'development';
  if (typeof options.nodeEnv === 'string') {
    process.env.NODE_ENV = nodeEnv || options.nodeEnv;
  } else {
    process.env.NODE_ENV = nodeEnv || rspackCommandDefaultEnv;
  }
  // let config = await this.loadConfig(options);
  const cli = new RspackCLI();
  const cliOptions = {
    'watch': false,
    'devtool': false,
    'analyze': false,
    'env': {},
    'argv': {},
  };
  const config = await cli.buildConfig(webpackToRspack(options), cliOptions, rspackCommand);

  return rspack(config);
}

function webpackToRspack(options: webpack.Configuration): RspackOptions {
  const {
    mode,
    devtool,
    target,
    entry,
    profile,
    context,
    resolve,
    output,
    watch,
    experiments,
    optimization,
    module,
    plugins,
  } = options;

  const convertResolve = (resolve: webpack.ResolveOptions = {}) => {
    const { extensions } = resolve;
    return {
      extensions: extensions,
    };
  };

  const convertOutput = (output: any) => {
    const {
      uniqueName,
      hashFunction,
      clean,
      path,
      publicPath,
      filename,
      chunkFilename,
      crossOriginLoading,
      trustedTypes,
      scriptType,
    } = output;
    return {
      uniqueName,
      // hashFunction,
      clean,
      path,
      publicPath,
      filename,
      chunkFilename,
      crossOriginLoading,
      trustedTypes,
    };
  };

  const convertExperiments = (experiments: any) => {
    const { asyncWebAssembly } = experiments;
    return { asyncWebAssembly };
  };

  const convertOptimization = (optimization: any) => {
    const { minimize, runtimeChunk, splitChunks } = optimization;

    const { cacheGroups } = splitChunks;
    delete cacheGroups.common.enforce;

    return {
      // fixme: hacks
      minimize: true,
      // fixme: hacks
      runtimeChunk: false,
      splitChunks: {
        // maxAsyncRequests: splitChunks?.maxAsyncRequests,
        cacheGroups: {
          default: cacheGroups['default'],
          common: cacheGroups.common,
        },
      },
    };
  };

  const convertModule = (module: any) => {
    const { parser, rules } = module;

    const wrapLoaderInUse = (rule: any) => {
      if (!rule.loader) return rule;
      rule.use = rule.use || [];
      rule.use.push({ loader: rule.loader });
      delete rule.loader;

      return rule;
    };

    const convertRules = (rules: any[]) => {
      return rules
        .filter((rule) => !rule.test.test('skip_rule.tsx'))
        .filter((rule) => !rule.test.test('skip__rule.css'))
        .filter((rule) => !rule.test.test('skip_rule.scss'))
        .filter((rule) => rule.test.toString().indexOf('sass') === -1)
        .filter((rule) => rule.test.toString().indexOf('less') === -1)
        .map((rule) => wrapLoaderInUse(rule));
    };

    // fixme: hacks
    delete parser.javascript.worker;

    let _rules = convertRules(rules);
    _rules = [
      ..._rules,
      {
        test: /\.?(scss)$/,
        resourceQuery: /\?ngResource/,
        use: [{ loader: 'raw-loader' }, { loader: 'sass-loader' }],
      },
    ];
    return {
      parser,
      rules: _rules,
    };
  };

  const convertPlugins = (plugins: any) => {
    // fixme: hacks
    const res = plugins
      .filter((plugin: any) => plugin.apply.toString().indexOf('compiler.hooks.shutdown') === -1)
      .filter((plugin: any) => plugin?.constructor?.name !== 'MiniCssExtractPlugin')
      // .filter((plugin: any) => plugin?.constructor?.name !== 'LicenseWebpackPlugin')
      // .filter((plugin: any) => plugin?.constructor?.name !== 'DedupeModuleResolvePlugin')
      .filter((plugin: any) => plugin?.constructor?.name !== 'AnyComponentStyleBudgetChecker')
      .filter((plugin: any) => plugin?.constructor?.name !== 'CommonJsUsageWarnPlugin')
      // fixme: hacks
      // .filter((plugin: any) => plugin?.constructor?.name !== 'ProgressPlugin')
      .filter((plugin: any) => plugin?.constructor?.name !== 'StylesWebpackPlugin');
    // .filter((plugin) => plugin?.constructor?.name !== 'SuppressExtractedTextChunksWebpackPlugin')

    return res;
  };

  // const builtins = { html: [{ template: './src/index.html' }] };

  const res = {
    mode,
    devtool: devtool as DevTool,
    target: target as Target,
    context,
    entry,
    resolve: convertResolve(resolve),
    output: convertOutput(output),
    watch,
    experiments: convertExperiments(experiments),
    optimization: convertOptimization(optimization),
    // builtins,
    module: convertModule(module),
    plugins: convertPlugins(plugins),

    // fixme: hacks
    cache: true,
  };

  return res as any;
}

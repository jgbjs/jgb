import JApp from '../JApp';
import JComponent from '../JComponent';
import JPage from '../JPage';

/**
 * 使用插件
 * @param plugin
 */
export default (plugin: { install: (data: any) => void }) => {
  plugin.install({
    JApp,
    JPage,
    JComponent
  });
};

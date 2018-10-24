import { bus } from './EventBus';
import JApp from './JApp';
import JComponent from './JComponent';
import JPage from './JPage';
import { NativeApiPlugin, RouterPlugin, use } from './plugins';
import { Router } from './plugins/router';
import { jgb } from './plugins/use';

use(NativeApiPlugin);
use(RouterPlugin);

export { JPage, JApp, JComponent, Router, bus, jgb, use };

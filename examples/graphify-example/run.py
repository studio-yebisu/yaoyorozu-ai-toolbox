"""Run reviewed Graphify affected.py on a deliberately small, independently prepared graph.
Code call edges: Python stdlib ast adapter below, NOT Graphify extraction.
Documentation edges: explicit author annotations, NOT LLM-inferred relations.
No network, installs, credentials, hooks, or global config writes.
"""
from pathlib import Path
import ast, dataclasses, importlib.util, json, sys
import networkx as nx
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('reviewed_graphify_affected',ROOT/'vendor/graphify/graphify/affected.py')
module=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=module
spec.loader.exec_module(module)
graph=nx.MultiDiGraph()
functions={}
for path in sorted((ROOT/'fixture').glob('*.py')):
    for node in ast.walk(ast.parse(path.read_text('utf-8'))):
        if isinstance(node,ast.FunctionDef):
            functions[node.name]=(path.name,node)
            graph.add_node(node.name,label=node.name,kind='function',source_file='fixture/'+path.name,source_location=str(node.lineno),evidence='stdlib-ast-adapter')
for name,(filename,node) in functions.items():
    for call in ast.walk(node):
        if isinstance(call,ast.Call) and isinstance(call.func,ast.Name) and call.func.id in functions:
            graph.add_edge(name,call.func.id,relation='calls',source_file='fixture/'+filename,source_location=str(call.lineno),evidence='stdlib-ast-adapter')
for doc,target in [('shipping-policy.md','shipping_fee'),('checkout-spec.md','checkout_total'),('estimate-spec.md','delivery_estimate')]:
    graph.add_node(doc,label=doc,kind='document',source_file='fixture/'+doc,source_location='2',evidence='human-authored-correspondence')
    graph.add_edge(doc,target,relation='references',source_file='fixture/'+doc,source_location='2',evidence='human-authored-correspondence')
from networkx.readwrite import json_graph
raw=json_graph.node_link_data(graph)
(ROOT/'outputs/graph.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
loaded=module.load_graph(ROOT/'outputs/graph.json')
seed=module.resolve_seed(loaded,'shipping_fee')
hits=module.affected_nodes(loaded,seed,depth=3)
actual={h.node_id for h in hits}
expected={'checkout_total','delivery_estimate','shipping-policy.md','checkout-spec.md','estimate-spec.md'}
assert actual==expected,(actual,expected)
assert module.affected_nodes(loaded,seed,depth=0)==[]
assert {h.node_id for h in module.affected_nodes(loaded,seed,depth=1)}=={'checkout_total','delivery_estimate','shipping-policy.md'}
assert {h.node_id for h in module.affected_nodes(loaded,seed,depth=3,relations=('calls',))}=={'checkout_total','delivery_estimate'}
assert module.resolve_seed(loaded,'missing_function') is None
sys.path.insert(0,str(ROOT/'fixture'))
from shipping import shipping_fee
from checkout import checkout_total
cases=[{'subtotal_yen':n,'shipping_yen':shipping_fee(n),'total_yen':checkout_total(n)} for n in [3999,4000,5000]]
assert [c['shipping_yen'] for c in cases]==[650,0,0]
result={'status':'passed','scope':'Only upstream load_graph / resolve_seed / affected_nodes / format_affected executed. Full Graphify CLI, tree-sitter extraction, semantic extraction and MCP were not run.','upstream_commit':'847a93f3cab5e2c82ea9170014b21cd2c52a4417','graph_origin':{'calls':'Our stdlib AST adapter on three tiny Python files','references':'Manually authored document-to-function mapping, not automatic inference'},'seed':seed,'depth':3,'hits':[dataclasses.asdict(h) for h in hits],'formatted':module.format_affected(loaded,'shipping_fee',depth=3),'fixture_runs':cases,'node_count':len(loaded),'edge_count':loaded.number_of_edges()}
(ROOT/'outputs/result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'outputs/affected.txt').write_text(result['formatted']+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))

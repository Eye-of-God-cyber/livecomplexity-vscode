import { SyntaxNode } from 'web-tree-sitter';

export type LoopClassification = 'constant' | 'linear' | 'logarithmic' | 'unknown';
export type LoopConfidence = 'high' | 'medium' | 'low';

export interface LoopClassificationResult {
  classification: LoopClassification;
  confidence: LoopConfidence;
}


/**
 * Classifies a loop's complexity behavior based on its AST node.
 */
export function classifyLoop(node: SyntaxNode): LoopClassificationResult {
  let updateNode: SyntaxNode | null = null;
  let conditionNode: SyntaxNode | null = null;
  let initializerNode: SyntaxNode | null = null;

  if (node.type === 'for_range_loop') {
    return { classification: 'linear', confidence: 'medium' };
  }

  if (node.type === 'for_statement') {
    conditionNode = node.childForFieldName('condition');
    initializerNode = node.childForFieldName('initializer');
    updateNode = node.childForFieldName('update');

    // FIX 2 — Missing condition guard:
    // A for_statement with no condition field (e.g. `for(i=0;;i++)`) is semantically
    // equivalent to `for(;;)` — it is an infinite loop. Return unknown immediately
    // so we do not confidently classify it as linear.
    if (updateNode !== null && conditionNode === null) {
      return { classification: 'unknown', confidence: 'low' };
    }

    // FIX 3 — comma_expression update handling:
    // Two-pointer and similar idioms use `l++, r--` in the update clause, which
    // tree-sitter parses as a comma_expression. Unwrap to the first operand so
    // the classifier can identify the increment pattern.
    if (updateNode && updateNode.type === 'comma_expression') {
      updateNode = updateNode.child(0) ?? updateNode;
    }
  } else if (node.type === 'while_statement' || node.type === 'do_statement') {
    conditionNode = node.childForFieldName('condition');
  }

  if (!updateNode) {
    const bodyNode = node.childForFieldName('body');
    updateNode = findBodyUpdate(bodyNode);
  }

  if (!updateNode) {
    return { classification: 'unknown', confidence: 'low' };
  }

  return analyzeUpdatePattern(updateNode, conditionNode, initializerNode);
}

function findBodyUpdate(bodyNode: SyntaxNode | null): SyntaxNode | null {
  if (!bodyNode) return null;
  const updates = bodyNode.descendantsOfType(['update_expression', 'assignment_expression', 'math_assignment_expression']);
  if (updates.length > 0) return updates[updates.length - 1]; // Use last update as conservative guess, or just first.
  return null;
}

function hasConstantInitializer(initializerNode: SyntaxNode | null): boolean {
  if (!initializerNode) return false;
  
  const initDeclarator = initializerNode.descendantsOfType('init_declarator')[0];
  if (initDeclarator) {
    const value = initDeclarator.childForFieldName('value');
    if (value && value.type === 'number_literal') return true;
  }
  
  const assignmentExpr = initializerNode.descendantsOfType('assignment_expression')[0];
  if (assignmentExpr) {
    const right = assignmentExpr.childForFieldName('right');
    if (right && right.type === 'number_literal') return true;
  }

  return false;
}

function analyzeUpdatePattern(
  updateNode: SyntaxNode, 
  conditionNode: SyntaxNode | null, 
  initializerNode: SyntaxNode | null
): LoopClassificationResult {
  if (updateNode.type === 'update_expression') {
    if (conditionNode && conditionNode.type === 'binary_expression') {
      const rightNode = conditionNode.childForFieldName('right');
      const leftNode = conditionNode.childForFieldName('left');
      
      const hasConstantBound = (rightNode && rightNode.type === 'number_literal') || 
                               (leftNode && leftNode.type === 'number_literal');
      
      if (hasConstantBound && hasConstantInitializer(initializerNode)) {
        return { classification: 'constant', confidence: 'high' };
      }
    }
    return { classification: 'linear', confidence: 'high' };
  }

  if (updateNode.type === 'assignment_expression' || updateNode.type === 'math_assignment_expression') {
    const operatorNode = updateNode.childForFieldName('operator') || updateNode.children.find(c => c.type === '+=' || c.type === '-=' || c.type === '*=' || c.type === '/=');
    const operator = operatorNode ? operatorNode.type : null;

    if (!operator) {
      const text = updateNode.text;
      if (text.includes('*=') || text.includes('/=')) return { classification: 'logarithmic', confidence: 'high' };
      if (text.includes('+=') || text.includes('-=')) return { classification: 'linear', confidence: 'medium' };
      // Normal assignment `i = i + 1`
      if (text.includes('*') || text.includes('/')) return { classification: 'logarithmic', confidence: 'low' };
      return { classification: 'linear', confidence: 'low' };
    }

    if (operator === '*=' || operator === '/=') {
      return { classification: 'logarithmic', confidence: 'high' };
    }
    if (operator === '+=' || operator === '-=') {
      return { classification: 'linear', confidence: 'medium' };
    }
  }

  return { classification: 'unknown', confidence: 'low' };
}
